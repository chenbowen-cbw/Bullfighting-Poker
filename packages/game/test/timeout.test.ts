import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@bullfighting/core';
import { applyAction } from '../src/reducer';
import { freshGame } from './helpers';
import type { GameState } from '../src/types';

describe('超时自动推进', () => {
  it('整局可由超时自动打完(抢庄→下注→亮牌→结算→等待)', () => {
    const rng = mulberry32(99);
    let s: GameState = applyAction(freshGame(), { type: 'START_ROUND', now: 0 }, rng).state;

    // 抢庄超时:无人抢 → 全部记 0,随机定庄,进入下注
    s = applyAction(s, { type: 'TIMEOUT', now: 20000 }, rng).state;
    expect(s.phase).toBe('betting');
    expect(s.bankerSeatId).not.toBeNull();
    for (const p of s.players) expect(p.robMultiplier).toBe(0);

    // 下注超时:闲家自动记 1,进入亮牌(已发牌)
    s = applyAction(s, { type: 'TIMEOUT', now: 40000 }, rng).state;
    expect(s.phase).toBe('reveal');
    for (const p of s.players) {
      if (!p.isBanker) expect(p.betMultiplier).toBe(1);
      expect(p.cards).toHaveLength(5);
    }

    // 亮牌超时:全部自动亮牌并结算
    const settled = applyAction(s, { type: 'TIMEOUT', now: 60000 }, rng);
    s = settled.state;
    expect(s.phase).toBe('settled');
    expect(s.players.every((p) => p.revealed)).toBe(true);
    expect(s.players.reduce((a, p) => a + (p.resultChips ?? 0), 0)).toBe(0);
    expect(settled.effects.some((e) => e.type === 'settle')).toBe(true);

    // 结算超时:回到等待,可开下一局
    s = applyAction(s, { type: 'TIMEOUT', now: 80000 }, rng).state;
    expect(s.phase).toBe('waiting');
    s = applyAction(s, { type: 'START_ROUND', now: 90000 }, rng).state;
    expect(s.phase).toBe('rob_banker');
    expect(s.roundNo).toBe(2);
  });

  it('waiting 阶段超时为空操作', () => {
    const rng = mulberry32(1);
    const s = freshGame();
    const res = applyAction(s, { type: 'TIMEOUT', now: 1000 }, rng);
    expect(res.state.phase).toBe('waiting');
    expect(res.effects).toHaveLength(0);
  });
});
