import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@bullfighting/core';
import { createInitialState } from '../src/state';
import { applyAction } from '../src/reducer';
import { GameError } from '../src/errors';
import { freshGame, SEATS } from './helpers';

describe('applyAction 完整对局流程', () => {
  it('抢庄→下注→发牌→亮牌→结算,且结算零和', () => {
    const rng = mulberry32(123);
    let s = freshGame();

    s = applyAction(s, { type: 'START_ROUND', now: 1000 }, rng).state;
    expect(s.phase).toBe('rob_banker');
    expect(s.roundNo).toBe(1);

    // 抢庄:A=1,B=3,C=2 → B 为庄(最高)
    s = applyAction(s, { type: 'ROB', seatId: 'A', multiplier: 1, now: 1001 }, rng).state;
    s = applyAction(s, { type: 'ROB', seatId: 'B', multiplier: 3, now: 1002 }, rng).state;
    expect(s.phase).toBe('rob_banker'); // C 尚未抢
    s = applyAction(s, { type: 'ROB', seatId: 'C', multiplier: 2, now: 1003 }, rng).state;
    expect(s.phase).toBe('betting');
    expect(s.bankerSeatId).toBe('B');
    expect(s.players.find((p) => p.seatId === 'B')?.isBanker).toBe(true);

    // 下注:A、C(庄家 B 不下注)
    s = applyAction(s, { type: 'BET', seatId: 'A', multiplier: 2, now: 1004 }, rng).state;
    expect(s.phase).toBe('betting');
    s = applyAction(s, { type: 'BET', seatId: 'C', multiplier: 1, now: 1005 }, rng).state;
    expect(s.phase).toBe('reveal');

    // 已发牌并评定
    for (const p of s.players) {
      expect(p.cards).toHaveLength(5);
      expect(p.hand).not.toBeNull();
    }

    // 亮牌
    s = applyAction(s, { type: 'REVEAL', seatId: 'A', now: 1006 }, rng).state;
    s = applyAction(s, { type: 'REVEAL', seatId: 'B', now: 1007 }, rng).state;
    const settled = applyAction(s, { type: 'REVEAL', seatId: 'C', now: 1008 }, rng);
    s = settled.state;
    expect(s.phase).toBe('settled');

    // 结算零和 + 产生 settle 副作用
    const sum = s.players.reduce((acc, p) => acc + (p.resultChips ?? 0), 0);
    expect(sum).toBe(0);
    expect(settled.effects.some((e) => e.type === 'settle')).toBe(true);
  });

  it('每次阶段切换都返回 scheduleTimeout 副作用', () => {
    const rng = mulberry32(1);
    const res = applyAction(freshGame(), { type: 'START_ROUND', now: 0 }, rng);
    expect(res.effects.some((e) => e.type === 'scheduleTimeout')).toBe(true);
    expect(res.state.deadline).toBe(res.state.config.robMillis);
  });

  it('reducer 不修改入参(纯函数)', () => {
    const rng = mulberry32(1);
    const s0 = freshGame();
    applyAction(s0, { type: 'START_ROUND', now: 0 }, rng);
    expect(s0.phase).toBe('waiting');
    expect(s0.roundNo).toBe(0);
  });
});

describe('applyAction 校验', () => {
  it('错误阶段操作被拒', () => {
    const rng = mulberry32(1);
    expect(() =>
      applyAction(freshGame(), { type: 'ROB', seatId: 'A', multiplier: 1, now: 1 }, rng),
    ).toThrow(GameError);
  });

  it('非对局玩家操作被拒', () => {
    const rng = mulberry32(1);
    const s = applyAction(freshGame(), { type: 'START_ROUND', now: 0 }, rng).state;
    expect(() =>
      applyAction(s, { type: 'ROB', seatId: 'Z', multiplier: 1, now: 1 }, rng),
    ).toThrowError(/不在本局/);
  });

  it('重复抢庄被拒', () => {
    const rng = mulberry32(1);
    let s = applyAction(freshGame(), { type: 'START_ROUND', now: 0 }, rng).state;
    s = applyAction(s, { type: 'ROB', seatId: 'A', multiplier: 1, now: 1 }, rng).state;
    expect(() =>
      applyAction(s, { type: 'ROB', seatId: 'A', multiplier: 2, now: 2 }, rng),
    ).toThrowError(/已操作/);
  });

  it('非法抢庄倍数被拒', () => {
    const rng = mulberry32(1);
    const s = applyAction(freshGame(), { type: 'START_ROUND', now: 0 }, rng).state;
    expect(() =>
      applyAction(s, { type: 'ROB', seatId: 'A', multiplier: 99, now: 1 }, rng),
    ).toThrowError(GameError);
  });

  it('庄家不能下注', () => {
    const rng = mulberry32(1);
    let s = applyAction(freshGame(), { type: 'START_ROUND', now: 0 }, rng).state;
    s = applyAction(s, { type: 'ROB', seatId: 'A', multiplier: 0, now: 1 }, rng).state;
    s = applyAction(s, { type: 'ROB', seatId: 'B', multiplier: 3, now: 2 }, rng).state;
    s = applyAction(s, { type: 'ROB', seatId: 'C', multiplier: 0, now: 3 }, rng).state;
    expect(s.bankerSeatId).toBe('B');
    expect(() =>
      applyAction(s, { type: 'BET', seatId: 'B', multiplier: 1, now: 4 }, rng),
    ).toThrowError(/庄家/);
  });

  it('人数不足无法开局', () => {
    const rng = mulberry32(1);
    const solo = createInitialState({ roomId: 'r', baseScore: 10, seats: [SEATS[0]] });
    expect(() => applyAction(solo, { type: 'START_ROUND', now: 0 }, rng)).toThrowError(/人数不足/);
  });
});
