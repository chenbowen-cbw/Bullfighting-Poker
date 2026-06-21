import { type Card, type Rank, Suit } from '../src/types';

const SUIT_MAP: Record<'S' | 'H' | 'C' | 'D', Suit> = {
  S: Suit.Spades,
  H: Suit.Hearts,
  C: Suit.Clubs,
  D: Suit.Diamonds,
};

/** 简写构造一张牌,如 c('S', 10)、c('H', 13) */
export function c(suit: 'S' | 'H' | 'C' | 'D', rank: Rank): Card {
  return { suit: SUIT_MAP[suit], rank };
}

/** 构造一手 5 张牌(语义糖) */
export function hand(...cards: Card[]): Card[] {
  return cards;
}
