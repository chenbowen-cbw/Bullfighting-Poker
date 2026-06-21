import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@bullfighting/core';
import { applyAction } from '../src/reducer';
import { projectState } from '../src/state';
import { freshGame } from './helpers';
import type { GameState } from '../src/types';

/** 驱动到 reveal 阶段(已发牌、尚未亮牌) */
function toRevealPhase(rng: () => number): GameState {
  let s = applyAction(freshGame(), { type: 'START_ROUND', now: 0 }, rng).state;
  s = applyAction(s, { type: 'ROB', seatId: 'A', multiplier: 1, now: 1 }, rng).state;
  s = applyAction(s, { type: 'ROB', seatId: 'B', multiplier: 2, now: 2 }, rng).state;
  s = applyAction(s, { type: 'ROB', seatId: 'C', multiplier: 0, now: 3 }, rng).state;
  s = applyAction(s, { type: 'BET', seatId: 'A', multiplier: 1, now: 4 }, rng).state;
  s = applyAction(s, { type: 'BET', seatId: 'C', multiplier: 1, now: 5 }, rng).state;
  return s;
}

describe('projectState 可见性', () => {
  it('亮牌前:本人手牌可见,他人手牌隐藏', () => {
    const s = toRevealPhase(mulberry32(5));
    expect(s.phase).toBe('reveal');
    const view = projectState(s, 'A');
    const self = view.players.find((p) => p.seatId === 'A');
    const other = view.players.find((p) => p.seatId === 'B');
    expect(self?.cards).toHaveLength(5);
    expect(other?.cards).toBeNull();
    expect(other?.hand).toBeNull();
  });

  it('某人亮牌后,其手牌对所有人可见', () => {
    const rng = mulberry32(5);
    let s = toRevealPhase(rng);
    s = applyAction(s, { type: 'REVEAL', seatId: 'B', now: 6 }, rng).state;
    const view = projectState(s, 'A');
    expect(view.players.find((p) => p.seatId === 'B')?.cards).toHaveLength(5);
  });

  it('结算阶段:所有手牌可见(无视 viewer)', () => {
    const rng = mulberry32(5);
    let s = toRevealPhase(rng);
    s = applyAction(s, { type: 'TIMEOUT', now: 100000 }, rng).state; // 自动亮牌结算
    expect(s.phase).toBe('settled');
    const view = projectState(s);
    for (const p of view.players) expect(p.cards).toHaveLength(5);
  });

  it('hasActed 在抢庄阶段反映是否已抢', () => {
    const rng = mulberry32(5);
    let s = applyAction(freshGame(), { type: 'START_ROUND', now: 0 }, rng).state;
    s = applyAction(s, { type: 'ROB', seatId: 'A', multiplier: 1, now: 1 }, rng).state;
    const view = projectState(s);
    expect(view.players.find((p) => p.seatId === 'A')?.hasActed).toBe(true);
    expect(view.players.find((p) => p.seatId === 'B')?.hasActed).toBe(false);
  });
});
