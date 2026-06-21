import { describe, it, expect } from 'vitest';
import { settle, type BankerEntry, type PlayerEntry } from '../src/settlement';
import { evaluate } from '../src/evaluator';
import { c } from './helpers';

const niuNiu = () => evaluate([c('S', 10), c('H', 10), c('C', 10), c('D', 13), c('S', 12)]); // 倍率 3
const niu9 = () => evaluate([c('S', 5), c('H', 5), c('C', 5), c('D', 4), c('S', 10)]); // 倍率 3
const none = () => evaluate([c('S', 1), c('H', 1), c('C', 2), c('D', 3), c('S', 9)]); // 倍率 1

const sumDeltas = (m: Map<string | number, number>): number =>
  [...m.values()].reduce((a, b) => a + b, 0);

describe('settle 结算', () => {
  it('庄家赢:按庄家牌型倍率结算,零和', () => {
    const banker: BankerEntry = { seatId: 'B', hand: niuNiu(), robMultiplier: 1 };
    const players: PlayerEntry[] = [{ seatId: 'P1', hand: none(), betMultiplier: 1 }];
    const { deltas } = settle(banker, players, { baseScore: 10 });
    // 金额 = 10 × 1 × 1 × 3(牛牛) = 30
    expect(deltas.get('B')).toBe(30);
    expect(deltas.get('P1')).toBe(-30);
    expect(sumDeltas(deltas)).toBe(0);
  });

  it('闲家赢:按闲家牌型倍率结算', () => {
    const banker: BankerEntry = { seatId: 'B', hand: none(), robMultiplier: 1 };
    const players: PlayerEntry[] = [{ seatId: 'P1', hand: niu9(), betMultiplier: 1 }];
    const { deltas } = settle(banker, players, { baseScore: 10 });
    // 金额 = 10 × 1 × 1 × 3(牛9) = 30
    expect(deltas.get('P1')).toBe(30);
    expect(deltas.get('B')).toBe(-30);
    expect(sumDeltas(deltas)).toBe(0);
  });

  it('下注倍数与抢庄倍数共同放大金额', () => {
    const banker: BankerEntry = { seatId: 'B', hand: niuNiu(), robMultiplier: 2 };
    const players: PlayerEntry[] = [{ seatId: 'P1', hand: none(), betMultiplier: 3 }];
    const { deltas } = settle(banker, players, { baseScore: 10 });
    // 金额 = 10 × 3 × 2 × 3 = 180
    expect(deltas.get('B')).toBe(180);
    expect(deltas.get('P1')).toBe(-180);
  });

  it('多闲家混合输赢,全场筹码守恒', () => {
    const banker: BankerEntry = { seatId: 'B', hand: niu9(), robMultiplier: 1 };
    const players: PlayerEntry[] = [
      { seatId: 'P1', hand: none(), betMultiplier: 1 }, // 输给庄
      { seatId: 'P2', hand: niuNiu(), betMultiplier: 2 }, // 赢庄
      { seatId: 'P3', hand: none(), betMultiplier: 1 }, // 输给庄
    ];
    const { deltas, details } = settle(banker, players, { baseScore: 10 });
    expect(sumDeltas(deltas)).toBe(0);
    expect(details).toHaveLength(3);
    expect(details.find((d) => d.seatId === 'P2')?.result).toBe('win');
    expect(details.find((d) => d.seatId === 'P1')?.result).toBe('lose');
  });
});
