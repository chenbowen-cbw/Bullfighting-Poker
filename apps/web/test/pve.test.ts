import { describe, it, expect } from 'vitest';
import {
  applyAction,
  createInitialState,
  isBotSeatId,
  type GameState,
  type PublicGameState,
} from '@bullfighting/game';
import { GameService } from '../src/lib/gameService';
import { driveBots } from '../src/lib/botDriver';
import type {
  GamePublisher,
  GameScheduler,
  GameSettlementSink,
  GameStateStore,
  PveRecord,
  PveRecordStore,
} from '../src/lib/gamePorts';

const HUMAN = 'human-1';

/** 记录关键调用的内存桩存储(带 TTL) */
class MemoryStore implements GameStateStore {
  state: GameState | null = null;
  readonly calls: string[];
  lastTtl: number | null = null;
  constructor(calls: string[]) {
    this.calls = calls;
  }
  async load(): Promise<GameState | null> {
    return this.state ? structuredClone(this.state) : null;
  }
  async save(_roomId: string, state: GameState): Promise<void> {
    this.calls.push('save');
    this.state = structuredClone(state);
  }
  async saveEphemeral(_roomId: string, state: GameState, ttlSeconds: number): Promise<void> {
    this.calls.push('saveEphemeral');
    this.lastTtl = ttlSeconds;
    this.state = structuredClone(state);
  }
}

class MemoryPveStore implements PveRecordStore {
  record: PveRecord | null = null;
  async load(): Promise<PveRecord | null> {
    return this.record;
  }
  async save(_roomId: string, record: PveRecord): Promise<void> {
    this.record = record;
  }
}

class SpySettlement implements GameSettlementSink {
  readonly calls: string[];
  constructor(calls: string[]) {
    this.calls = calls;
  }
  async apply(): Promise<{ roundId: string }> {
    this.calls.push('settle'); // 出现即视为「错误地入库结算了」
    return { roundId: 'x' };
  }
}

class CountingPublisher implements GamePublisher {
  broadcasts = 0;
  async broadcast(): Promise<void> {
    this.broadcasts += 1; // 逐步广播每个静止态;至少广播一次
  }
}

class SpyScheduler implements GameScheduler {
  readonly calls: string[];
  constructor(calls: string[]) {
    this.calls = calls;
  }
  async schedule(): Promise<void> {
    this.calls.push('schedule'); // 出现即视为「错误地调度了 QStash」
  }
}

function makeService(calls: string[]) {
  const store = new MemoryStore(calls);
  const pveStore = new MemoryPveStore();
  const settlement = new SpySettlement(calls);
  const scheduler = new SpyScheduler(calls);
  const publisher = new CountingPublisher();
  const svc = new GameService(store, publisher, scheduler, settlement, pveStore);
  return { svc, store, pveStore, publisher };
}

/** 人类在某阶段是否仍需行动(与后端 driveBots 的人类侧镜像) */
function humanObligation(state: PublicGameState): 'rob' | 'bet' | 'reveal' | null {
  const me = state.players.find((p) => p.seatId === HUMAN);
  if (!me) return null;
  switch (state.phase) {
    case 'rob_banker':
      return me.robMultiplier === null ? 'rob' : null;
    case 'betting':
      return !me.isBanker && me.betMultiplier === null ? 'bet' : null;
    case 'reveal':
      return !me.revealed ? 'reveal' : null;
    default:
      return null;
  }
}

/** 让人类完成其每个阶段义务,把一局推进到结算并返回最终投影 */
async function playToSettled(
  svc: GameService,
  roomId: string,
  start: PublicGameState,
): Promise<PublicGameState> {
  let view = start;
  for (let guard = 0; guard < 30 && view.phase !== 'settled'; guard++) {
    const ob = humanObligation(view);
    if (ob === 'rob') {
      view = await svc.act(
        roomId,
        { type: 'ROB', seatId: HUMAN, multiplier: 2, now: Date.now() },
        HUMAN,
      );
    } else if (ob === 'bet') {
      view = await svc.act(
        roomId,
        { type: 'BET', seatId: HUMAN, multiplier: 1, now: Date.now() },
        HUMAN,
      );
    } else if (ob === 'reveal') {
      view = await svc.act(roomId, { type: 'REVEAL', seatId: HUMAN, now: Date.now() }, HUMAN);
    } else {
      const latest = await svc.getState(roomId, HUMAN);
      if (!latest) throw new Error('状态丢失');
      view = latest;
    }
  }
  return view;
}

describe('PvE 完整一局(startPve → 人类逐步 → settled),不入库/不调度', () => {
  it('机器人补齐其义务,阶段到达 settled,resultChips 落定,且 settle/schedule 从未被调用', async () => {
    const calls: string[] = [];
    const { svc, store, pveStore, publisher } = makeService(calls);

    // 开局:人类 + 3 机器人
    const { roomId, state: startView } = await svc.startPve(HUMAN, {
      difficulty: 'hard',
      botCount: 3,
      baseScore: 10,
    });
    expect(roomId.startsWith('pve:')).toBe(true);
    expect(pveStore.record).toEqual({
      difficulty: 'hard',
      createdBy: HUMAN,
      baseScore: 10,
      botCount: 3,
    });
    // 开局后已进入抢庄,且机器人均已抢庄(仅人类待抢)
    expect(startView.phase).toBe('rob_banker');
    const botsRobbed = startView.players
      .filter((p) => isBotSeatId(p.seatId))
      .every((p) => p.robMultiplier !== null);
    expect(botsRobbed).toBe(true);

    // 人类依次完成其每个阶段的义务,直至结算
    const view = await playToSettled(svc, roomId, startView);

    expect(view.phase).toBe('settled');

    // 每位玩家都拿到结算盈亏,且零和
    for (const p of view.players) {
      expect(p.resultChips).not.toBeNull();
    }
    const sum = view.players.reduce((acc, p) => acc + (p.resultChips ?? 0), 0);
    expect(sum).toBe(0);

    // 关键:绝不入库结算、绝不调度 QStash
    expect(calls).not.toContain('settle');
    expect(calls).not.toContain('schedule');
    // 状态以 TTL 保存(saveEphemeral),从不走无 TTL 的 save
    expect(calls).toContain('saveEphemeral');
    expect(calls).not.toContain('save');
    expect(store.lastTtl).toBe(2 * 60 * 60);
    // 至少广播过一次(逐步广播每个静止态)
    expect(publisher.broadcasts).toBeGreaterThan(0);
  });

  it('nextPveRound 仅创建者可开;非创建者被拒', async () => {
    const calls: string[] = [];
    const { svc } = makeService(calls);
    const { roomId, state: startView } = await svc.startPve(HUMAN, {
      difficulty: 'easy',
      botCount: 2,
      baseScore: 10,
    });

    // 先把第一局打到结算(reducer 仅允许从 waiting/settled 开新局)
    const settled = await playToSettled(svc, roomId, startView);
    expect(settled.phase).toBe('settled');

    // 非创建者无权开下一局
    await expect(svc.nextPveRound(roomId, 'someone-else')).rejects.toThrow();

    // 创建者可开下一局,局号自增且回到抢庄
    const view = await svc.nextPveRound(roomId, HUMAN);
    expect(view.phase).toBe('rob_banker');
    expect(view.roundNo).toBe(2);
    // 仍未入库/未调度
    expect(calls).not.toContain('settle');
    expect(calls).not.toContain('schedule');
  });
});

describe('driveBots 终止性与边界', () => {
  it('全人类局:不替人类行动(steps 为空)', () => {
    let s = createInitialState({
      roomId: 'pve:humans',
      baseScore: 10,
      seats: [
        { seatId: HUMAN, seatNo: 0 },
        { seatId: 'human-2', seatNo: 1 },
      ],
    });
    s = applyAction(s, { type: 'START_ROUND', now: 0 }).state; // rob_banker
    const { state, steps } = driveBots(s, 'hard');
    expect(steps).toHaveLength(0);
    expect(state.phase).toBe('rob_banker'); // 仍等待人类抢庄
  });

  it('1 人类 + 多机器人开局:机器人补齐后,唯一待行动者是人类', () => {
    let s = createInitialState({
      roomId: 'pve:mixed',
      baseScore: 10,
      seats: [
        { seatId: HUMAN, seatNo: 0 },
        { seatId: 'bot:1', seatNo: 1 },
        { seatId: 'bot:2', seatNo: 2 },
      ],
    });
    s = applyAction(s, { type: 'START_ROUND', now: 0 }).state;
    const { state } = driveBots(s, 'medium');
    // 仍在抢庄阶段:机器人都抢完,唯一未抢者是人类
    expect(state.phase).toBe('rob_banker');
    const pending = state.players.filter((p) => p.robMultiplier === null);
    expect(pending).toHaveLength(1);
    expect(pending[0].seatId).toBe(HUMAN);
  });
});
