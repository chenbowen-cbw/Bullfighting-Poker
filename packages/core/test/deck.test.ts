import { describe, it, expect } from 'vitest';
import { createDeck, shuffle, deal } from '../src/deck';
import { mulberry32 } from '../src/rng';
import type { Card } from '../src/types';

const key = (c: Card): string => `${c.suit}${c.rank}`;

describe('deck', () => {
  it('createDeck 生成 52 张互不相同的牌', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map(key)).size).toBe(52);
  });

  it('shuffle 不修改原数组,且保留全部牌', () => {
    const deck = createDeck();
    const copy = deck.slice();
    const shuffled = shuffle(deck, mulberry32(123));
    expect(deck).toEqual(copy);
    expect(shuffled).toHaveLength(52);
    expect(new Set(shuffled.map(key)).size).toBe(52);
  });

  it('相同种子可复现,不同种子结果不同', () => {
    const deck = createDeck();
    expect(shuffle(deck, mulberry32(42))).toEqual(shuffle(deck, mulberry32(42)));
    expect(shuffle(deck, mulberry32(42))).not.toEqual(shuffle(deck, mulberry32(43)));
  });

  it('deal 正确分发手牌与余牌,无重复', () => {
    const deck = shuffle(createDeck(), mulberry32(7));
    const { hands, rest } = deal(deck, 5, 5);
    expect(hands).toHaveLength(5);
    for (const h of hands) expect(h).toHaveLength(5);
    expect(rest).toHaveLength(52 - 25);
    expect(new Set(hands.flat().map(key)).size).toBe(25);
  });

  it('deal 牌不够时抛错', () => {
    expect(() => deal(createDeck(), 11, 5)).toThrow();
  });
});
