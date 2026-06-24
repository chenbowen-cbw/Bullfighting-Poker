import {
  applyAction,
  createInitialState,
  projectState,
  GameError,
  BOT_SEAT_PREFIX,
  type BotDifficulty,
  type GameAction,
  type GameState,
  type PublicGameState,
  type SeatInput,
} from '@bullfighting/game';
import type { RoundSettlementContext } from '@bullfighting/stats';
import { driveBots } from './botDriver';
import type {
  GamePublisher,
  GameScheduler,
  GameSettlementSink,
  GameStateStore,
  PveRecord,
  PveRecordStore,
} from './gamePorts';

/** 人机练习房 roomId 前缀(纯 Redis,不入库) */
const PVE_ROOM_PREFIX = 'pve:';
/** 人机练习 Redis 键 TTL:2 小时(被遗弃的练习房自动过期) */
const PVE_TTL_SECONDS = 2 * 60 * 60;

/** 人机练习开局参数 */
export interface StartPveOptions {
  difficulty: BotDifficulty;
  botCount: number;
  baseScore: number;
}

/** 是否为人机练习房 */
function isPveRoom(roomId: string): boolean {
  return roomId.startsWith(PVE_ROOM_PREFIX);
}

/** 对局编排服务:加载状态 → 应用动作 → 持久化 → 执行副作用 → 广播 */
export class GameService {
  constructor(
    private readonly store: GameStateStore,
    private readonly publisher: GamePublisher,
    private readonly scheduler: GameScheduler,
    private readonly settlement: GameSettlementSink,
    /** 人机练习元信息存储(可选;仅 PvE 路径使用) */
    private readonly pveStore?: PveRecordStore,
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
    if (isPveRoom(roomId)) return this.dispatchPve(state, action, viewerSeatId);
    return this.dispatch(state, action, viewerSeatId);
  }

  async handleTimeout(roomId: string, deadline: number): Promise<void> {
    const state = await this.store.load(roomId);
    if (!state || state.deadline !== deadline) return; // 过期/不匹配的定时器,忽略
    await this.dispatch(state, { type: 'TIMEOUT', now: Date.now() }, '');
  }

  /**
   * 玩家中途离桌/掉线:从对局花名册移除。
   * 进行中的回合会被作废回到等待(绝不部分结算),人数不足则空置;随后广播新状态。
   * 仅 PvP 调用(PvE 为单人临时房,不经此路径)。
   */
  async handlePlayerLeft(roomId: string, seatId: string): Promise<void> {
    const state = await this.store.load(roomId);
    if (!state || !state.players.some((p) => p.seatId === seatId)) return;
    const { state: next } = applyAction(state, { type: 'REMOVE_PLAYER', seatId, now: Date.now() });
    await this.store.save(next.roomId, next);
    await this.publisher.broadcast(next);
  }

  /**
   * 客户端超时兜底:当 QStash 定时未能触发时,由前端在察觉截止时间已过后调用。
   * 仅参与者可触发,且仅当 deadline 确已过去时才推进一次 TIMEOUT(防止提前催熟)。
   * PvE 由机器人同步驱动,不走此路径。
   */
  async tickIfExpired(roomId: string, viewerSeatId: string): Promise<PublicGameState | null> {
    const state = await this.store.load(roomId);
    if (!state) return null;
    if (!state.players.some((p) => p.seatId === viewerSeatId)) return null;
    if (state.deadline === null || Date.now() < state.deadline) {
      return projectState(state, viewerSeatId);
    }
    if (isPveRoom(roomId)) return projectState(state, viewerSeatId);
    return this.dispatch(state, { type: 'TIMEOUT', now: Date.now() }, viewerSeatId);
  }

  async getState(roomId: string, viewerSeatId: string): Promise<PublicGameState | null> {
    const state = await this.store.load(roomId);
    if (!state) return null;
    // 仅本局参与者可读取房间状态:viewer 不在座位中则视为无状态(sync 返回 404/空)。
    // PvP 与 PvE 的人类玩家其 seatId 即 user.id,均在 players 内;旁观者/越权者读不到。
    if (!state.players.some((p) => p.seatId === viewerSeatId)) return null;
    return projectState(state, viewerSeatId);
  }

  private async dispatch(
    state: GameState,
    action: GameAction,
    viewerSeatId: string,
  ): Promise<PublicGameState> {
    const { state: next, effects } = applyAction(state, action);

    // 先做结算落库(幂等:见 DrizzleGameSettlement 的 ON CONFLICT DO NOTHING),
    // 成功后再持久化 settled 状态。若落库抛错则状态不落盘,后续动作/超时会重入重试,
    // 配合 rounds(roomId, roundNo) 唯一约束保证"恰好结算一次"——既不丢账也不重复入账。
    for (const effect of effects) {
      if (effect.type === 'settle') {
        await this.settlement.apply(buildRoundContext(next));
      }
    }

    await this.store.save(next.roomId, next);

    for (const effect of effects) {
      if (effect.type === 'scheduleTimeout') {
        await this.scheduler.schedule(next.roomId, effect.deadline);
      }
    }

    await this.publisher.broadcast(next);
    return projectState(next, viewerSeatId);
  }

  // ───────────────────────── 人机练习(PvE)路径 ─────────────────────────
  //
  // 设计要点(与 PvP 路径完全隔离):
  // - 纯 Redis、不入库:绝不调用 settlement.apply(机器人无 users 行,练习不计真实筹码/战绩)。
  // - 机器人 100% 服务端驱动,无需 QStash:不调用 scheduler.schedule。
  // - 状态以 TTL 保存,遗弃的练习房自动过期。
  // - 仅按 JWT 的 viewerSeatId(= 人类 user.id)授权动作;reducer 校验其确为本局玩家。

  /** 开一局人机练习:建初始状态 → START_ROUND → 机器人抢庄 → 落 Redis(带 TTL)→ 广播 */
  async startPve(
    humanUserId: string,
    opts: StartPveOptions,
  ): Promise<{ roomId: string; state: PublicGameState }> {
    const { difficulty, botCount, baseScore } = opts;
    const roomId = `${PVE_ROOM_PREFIX}${crypto.randomUUID()}`;

    const seats: SeatInput[] = [
      { seatId: humanUserId, seatNo: 0 },
      ...Array.from({ length: botCount }, (_, i) => ({
        seatId: `${BOT_SEAT_PREFIX}${i + 1}`,
        seatNo: i + 1,
      })),
    ];

    const initial = createInitialState({ roomId, baseScore, seats });
    const started = applyAction(initial, { type: 'START_ROUND', now: Date.now() }).state;
    // 机器人先抢庄(以及任何当前阶段它们应做的操作)
    const { state: driven } = driveBots(started, difficulty);

    const record: PveRecord = { difficulty, createdBy: humanUserId, baseScore, botCount };
    await this.savePveState(driven);
    await this.pveStore?.save(roomId, record, PVE_TTL_SECONDS);
    await this.publisher.broadcast(driven);

    return { roomId, state: projectState(driven, humanUserId) };
  }

  /** 同一练习房开下一局:仅创建者可操作;重新 START_ROUND → 机器人抢庄 → 落 Redis → 广播 */
  async nextPveRound(roomId: string, humanUserId: string): Promise<PublicGameState> {
    const state = await this.store.load(roomId);
    if (!state) throw GameError.wrongPhase('练习房不存在或已过期');
    const record = await this.loadPveRecord(roomId);
    if (record.createdBy !== humanUserId) throw GameError.notInGame('仅练习房创建者可开下一局');

    const started = applyAction(state, { type: 'START_ROUND', now: Date.now() }).state;
    const { state: driven } = driveBots(started, record.difficulty);

    await this.savePveState(driven);
    // 续期元信息 TTL,保持与状态一致
    await this.pveStore?.save(roomId, record, PVE_TTL_SECONDS);
    await this.publisher.broadcast(driven);

    return projectState(driven, humanUserId);
  }

  /**
   * PvE 动作派发:应用人类动作后驱动机器人补齐其义务。
   * 跳过结算落库与 QStash;逐步广播每个中间静止态(便于前端呈现机器人逐个行动)。
   */
  private async dispatchPve(
    state: GameState,
    action: GameAction,
    viewerSeatId: string,
  ): Promise<PublicGameState> {
    const record = await this.loadPveRecord(state.roomId);
    // 续期元信息 TTL:长局多动作时,避免 pve:{roomId} 记录键先于状态过期而丢失元信息
    await this.pveStore?.save(state.roomId, record, PVE_TTL_SECONDS);

    // 1) 人类动作
    const afterHuman = applyAction(state, action).state;
    // 2) 机器人补齐(跨自动阶段切换),收集中间态用于逐步广播
    const { state: final, steps } = driveBots(afterHuman, record.difficulty);

    // 持久化最终态(带 TTL);绝不落库结算、绝不调度定时器
    await this.savePveState(final);

    // 逐步广播:先广播人类动作后的静止态,再依次广播机器人每一步;
    // 若无机器人步骤则至少广播一次最终态。
    const frames = steps.length > 0 ? [afterHuman, ...steps] : [final];
    for (const frame of frames) {
      await this.publisher.broadcast(frame);
    }

    return projectState(final, viewerSeatId);
  }

  /** 读取练习房元信息;缺失则报错(状态在、记录丢失视为异常/过期) */
  private async loadPveRecord(roomId: string): Promise<PveRecord> {
    const record = await this.pveStore?.load(roomId);
    if (!record) throw GameError.wrongPhase('练习房信息不存在或已过期');
    return record;
  }

  /** 保存 PvE 状态:优先带 TTL,store 未实现 saveEphemeral 时回退普通 save */
  private async savePveState(state: GameState): Promise<void> {
    if (this.store.saveEphemeral) {
      await this.store.saveEphemeral(state.roomId, state, PVE_TTL_SECONDS);
    } else {
      await this.store.save(state.roomId, state);
    }
  }
}

/** 由结算后的对局状态构造结算落库上下文 */
export function buildRoundContext(state: GameState): RoundSettlementContext {
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
