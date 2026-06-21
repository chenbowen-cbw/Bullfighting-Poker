import { Rest } from 'ably';
import { Client } from '@upstash/qstash';
import { Redis } from '@upstash/redis';
import {
  applyAction,
  createInitialState,
  projectState,
  GameError,
  type GameAction,
  type GameState,
  type PublicGameState,
  type SeatInput,
} from '@bullfighting/game';
import type { RoundSettlementContext } from '@bullfighting/stats';
import type { GamePublisher, GameScheduler, GameSettlementSink, GameStateStore } from './gamePorts';
import { RedisGameStateStore } from './gameStateStore';
import { AblyGamePublisher } from './gamePublisher';
import { QStashGameScheduler } from './gameScheduler';
import { DrizzleGameSettlement } from './gameSettlement';

/** 对局编排服务:加载状态 → 应用动作 → 持久化 → 执行副作用 → 广播 */
export class GameService {
  constructor(
    private readonly store: GameStateStore,
    private readonly publisher: GamePublisher,
    private readonly scheduler: GameScheduler,
    private readonly settlement: GameSettlementSink,
  ) {}

  async startRound(
    roomId: string,
    seats: SeatInput[],
    baseScore: number,
    viewerSeatId: string,
  ): Promise<PublicGameState> {
    const existing = await this.store.load(roomId);
    const state = existing ?? createInitialState({ roomId, baseScore, seats });
    return this.dispatch(state, { type: 'START_ROUND', now: Date.now() }, viewerSeatId);
  }

  async act(roomId: string, action: GameAction, viewerSeatId: string): Promise<PublicGameState> {
    const state = await this.store.load(roomId);
    if (!state) throw GameError.wrongPhase('对局尚未开始');
    return this.dispatch(state, action, viewerSeatId);
  }

  async handleTimeout(roomId: string, deadline: number): Promise<void> {
    const state = await this.store.load(roomId);
    if (!state || state.deadline !== deadline) return; // 过期/不匹配的定时器,忽略
    await this.dispatch(state, { type: 'TIMEOUT', now: Date.now() }, '');
  }

  async getState(roomId: string, viewerSeatId: string): Promise<PublicGameState | null> {
    const state = await this.store.load(roomId);
    return state ? projectState(state, viewerSeatId) : null;
  }

  private async dispatch(
    state: GameState,
    action: GameAction,
    viewerSeatId: string,
  ): Promise<PublicGameState> {
    const { state: next, effects } = applyAction(state, action);
    await this.store.save(next.roomId, next);
    for (const effect of effects) {
      if (effect.type === 'scheduleTimeout') {
        await this.scheduler.schedule(next.roomId, effect.deadline);
      } else if (effect.type === 'settle') {
        // 从结算后的对局状态构造落库上下文,交由 sink 在单事务内持久化
        await this.settlement.apply(buildRoundContext(next));
      }
    }
    await this.publisher.broadcast(next);
    return projectState(next, viewerSeatId);
  }
}

/** 由结算后的对局状态构造结算落库上下文 */
function buildRoundContext(state: GameState): RoundSettlementContext {
  return {
    roomId: state.roomId,
    roundNo: state.roundNo,
    bankerSeatId: state.bankerSeatId,
    baseScore: state.baseScore,
    players: state.players.map((p) => ({
      userId: p.seatId,
      seatNo: p.seatNo,
      cards: p.cards,
      niuType: p.hand?.type ?? null,
      niuValue: p.hand?.niuValue ?? null,
      isBanker: p.isBanker,
      betMultiplier: p.betMultiplier ?? 1,
      robMultiplier: p.robMultiplier ?? 1,
      resultChips: p.resultChips ?? 0,
    })),
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 未配置`);
  return value;
}

let cached: GameService | undefined;

/** 惰性装配对局服务(Redis 状态 + Ably 广播 + QStash 定时 + 事务化结算落库) */
export function getGameService(): GameService {
  if (!cached) {
    const callbackUrl = `${requireEnv('APP_URL')}/api/internal/qstash/advance`;
    cached = new GameService(
      new RedisGameStateStore(Redis.fromEnv()),
      new AblyGamePublisher(new Rest(requireEnv('ABLY_API_KEY'))),
      new QStashGameScheduler(new Client({ token: requireEnv('QSTASH_TOKEN') }), callbackUrl),
      new DrizzleGameSettlement(requireEnv('DATABASE_URL')),
    );
  }
  return cached;
}
