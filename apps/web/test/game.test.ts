import { describe, it, expect } from 'vitest';
import { createInitialState, applyAction, type GameState } from '@bullfighting/game';
import { mulberry32 } from '@bullfighting/core';
import { GameService } from '../src/lib/gameService';
import type {
  GamePublisher,
  GameScheduler,
  GameSettlementSink,
  GameStateStore,
} from '../src/lib/gamePorts';

/** 构造"还差最后一人亮牌就结算"的 reveal 态(2 人:A 闲家、B 庄家,A 待亮) */
function revealStatePendingA(): GameState {
  const rng = mulberry32(1);
  let s = createInitialState({
    roomId: 'r1',
    baseScore: 10,
    seats: [
      { seatId: 'A', seatNo: 0 },
      { seatId: 'B', seatNo: 1 },
    ],
  });
  s = applyAction(s, { type: 'START_ROUND', now: 0 }, rng).state;
  s = applyAction(s, { type: 'ROB', seatId: 'A', multiplier: 0, now: 1 }, rng).state;
  s = applyAction(s, { type: 'ROB', seatId: 'B', multiplier: 2, now: 2 }, rng).state; // B 为庄
  s = applyAction(s, { type: 'BET', seatId: 'A', multiplier: 1, now: 3 }, rng).state; // 进入 reveal
  s = applyAction(s, { type: 'REVEAL', seatId: 'B', now: 4 }, rng).state; // B 已亮,A 待亮
  return s;
}

class FakeStore implements GameStateStore {
  constructor(
    private readonly state: GameState,
    readonly calls: string[],
  ) {}
  async load(): Promise<GameState> {
    return structuredClone(this.state);
  }
  async save(): Promise<void> {
    this.calls.push('save');
  }
}

class FakeSettlement implements GameSettlementSink {
  constructor(
    readonly calls: string[],
    private readonly fail = false,
  ) {}
  async apply(): Promise<{ roundId: string }> {
    this.calls.push('settle');
    if (this.fail) throw new Error('db down');
    return { roundId: '1' };
  }
}

const noopPublisher: GamePublisher = { async broadcast() {} };
const noopScheduler: GameScheduler = { async schedule() {} };

describe('GameService 结算编排', () => {
  it('最后一人亮牌:先落库结算,再保存 settled 状态', async () => {
    const calls: string[] = [];
    const svc = new GameService(
      new FakeStore(revealStatePendingA(), calls),
      noopPublisher,
      noopScheduler,
      new FakeSettlement(calls),
    );
    await svc.act('r1', { type: 'REVEAL', seatId: 'A', now: 1000 }, 'A');
    expect(calls).toEqual(['settle', 'save']);
  });

  it('结算落库失败时不保存 settled 状态(便于重试,不丢账)', async () => {
    const calls: string[] = [];
    const svc = new GameService(
      new FakeStore(revealStatePendingA(), calls),
      noopPublisher,
      noopScheduler,
      new FakeSettlement(calls, true),
    );
    await expect(svc.act('r1', { type: 'REVEAL', seatId: 'A', now: 1000 }, 'A')).rejects.toThrow();
    expect(calls).toEqual(['settle']); // save 未被调用
  });
});
