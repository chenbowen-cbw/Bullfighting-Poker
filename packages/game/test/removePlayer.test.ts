import { describe, it, expect } from 'vitest';
import { applyAction } from '../src/reducer';
import { freshGame } from './helpers';

describe('REMOVE_PLAYER(中途离桌)', () => {
  it('等待态移除:仅移出花名册,仍为等待,无副作用', () => {
    const s0 = freshGame(); // waiting, 3 人
    const { state, effects } = applyAction(s0, { type: 'REMOVE_PLAYER', seatId: 'B', now: 1 });
    expect(state.players.map((p) => p.seatId)).toEqual(['A', 'C']);
    expect(state.phase).toBe('waiting');
    expect(effects).toEqual([]);
  });

  it('进行中移除:本局作废,回到等待并清空本局产物', () => {
    let s = freshGame();
    s = applyAction(s, { type: 'START_ROUND', now: 1000 }).state; // rob_banker
    s = applyAction(s, { type: 'ROB', seatId: 'A', multiplier: 2, now: 1001 }).state;
    expect(s.phase).toBe('rob_banker');

    const { state } = applyAction(s, { type: 'REMOVE_PLAYER', seatId: 'A', now: 1002 });
    expect(state.players.map((p) => p.seatId)).toEqual(['B', 'C']);
    expect(state.phase).toBe('waiting');
    expect(state.deadline).toBeNull();
    expect(state.bankerSeatId).toBeNull();
    for (const p of state.players) {
      expect(p.robMultiplier).toBeNull();
      expect(p.betMultiplier).toBeNull();
      expect(p.cards).toBeNull();
      expect(p.revealed).toBe(false);
      expect(p.resultChips).toBeNull();
    }
  });

  it('移除不存在的玩家:幂等无操作', () => {
    const s0 = freshGame();
    const { state } = applyAction(s0, { type: 'REMOVE_PLAYER', seatId: 'ZZZ', now: 1 });
    expect(state.players).toHaveLength(3);
    expect(state.phase).toBe('waiting');
  });

  it('移除后人数不足开局下限:停在等待态', () => {
    let s = freshGame();
    s = applyAction(s, { type: 'START_ROUND', now: 1000 }).state; // rob_banker, 3 人
    s = applyAction(s, { type: 'REMOVE_PLAYER', seatId: 'A', now: 1001 }).state; // 余 2,作废→等待
    expect(s.phase).toBe('waiting');
    s = applyAction(s, { type: 'REMOVE_PLAYER', seatId: 'B', now: 1002 }).state; // 余 1(< 2)
    expect(s.players.map((p) => p.seatId)).toEqual(['C']);
    expect(s.phase).toBe('waiting');
    expect(s.deadline).toBeNull();
  });
});
