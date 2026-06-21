import { describe, it, expect } from 'vitest';
import { compareHands } from '../src/comparator';
import { evaluate } from '../src/evaluator';
import { type Card, type HandResult, type Rank, NiuType } from '../src/types';
import { c } from './helpers';

function fakeHand(
  weight: number,
  maxCard: Card,
  opts: { type?: NiuType; bombRank?: Rank | null } = {},
): HandResult {
  return {
    cards: [],
    type: opts.type ?? NiuType.None,
    niuValue: -1,
    weight,
    multiplier: 1,
    bullCards: null,
    pointCards: null,
    maxCard,
    bombRank: opts.bombRank ?? null,
  };
}

describe('compareHands', () => {
  it('牌型权重大者胜', () => {
    expect(compareHands(fakeHand(5, c('S', 2)), fakeHand(3, c('S', 13)))).toBeGreaterThan(0);
    expect(compareHands(fakeHand(3, c('S', 13)), fakeHand(5, c('S', 2)))).toBeLessThan(0);
  });

  it('同权重比最大单张点数', () => {
    expect(compareHands(fakeHand(6, c('S', 13)), fakeHand(6, c('D', 5)))).toBeGreaterThan(0);
  });

  it('同权重同点数比花色(♠>♥>♣>♦)', () => {
    expect(compareHands(fakeHand(6, c('S', 13)), fakeHand(6, c('H', 13)))).toBeGreaterThan(0);
    expect(compareHands(fakeHand(6, c('C', 13)), fakeHand(6, c('D', 13)))).toBeGreaterThan(0);
  });

  it('四炸优先比四条点数(而非最大单张)', () => {
    const big = fakeHand(12, c('S', 2), { type: NiuType.Bomb, bombRank: 13 });
    const small = fakeHand(12, c('S', 3), { type: NiuType.Bomb, bombRank: 5 });
    expect(compareHands(big, small)).toBeGreaterThan(0);
  });

  it('比较具有反对称性', () => {
    const a = fakeHand(7, c('S', 9));
    const b = fakeHand(4, c('H', 11));
    expect(Math.sign(compareHands(a, b))).toBe(-Math.sign(compareHands(b, a)));
  });

  it('真实牌型整体大小序:五小牛 > 四炸 > 五花牛 > 牛牛 > 牛9 > 没牛', () => {
    const wuXiao = evaluate([c('S', 1), c('H', 1), c('C', 1), c('D', 2), c('S', 4)]);
    const bomb = evaluate([c('S', 13), c('H', 13), c('C', 13), c('D', 13), c('S', 2)]);
    const wuHua = evaluate([c('S', 11), c('H', 12), c('C', 13), c('D', 11), c('S', 12)]);
    const niuNiu = evaluate([c('S', 10), c('H', 10), c('C', 10), c('D', 13), c('S', 12)]);
    const niu9 = evaluate([c('S', 5), c('H', 5), c('C', 5), c('D', 4), c('S', 10)]);
    const none = evaluate([c('S', 1), c('H', 1), c('C', 2), c('D', 3), c('S', 9)]);

    const ordered = [wuXiao, bomb, wuHua, niuNiu, niu9, none];
    for (let i = 0; i < ordered.length - 1; i++) {
      expect(compareHands(ordered[i], ordered[i + 1])).toBeGreaterThan(0);
    }
  });
});
