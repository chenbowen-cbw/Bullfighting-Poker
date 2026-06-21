import type { Card, Rank } from './types';

/** 单张点数:A=1,2..9 取面值,10/J/Q/K 记为 10 */
export function rankPoint(rank: Rank): number {
  return rank > 10 ? 10 : rank;
}

/** 一张牌的点数 */
export function cardPoint(card: Card): number {
  return rankPoint(card.rank);
}

/** 多张牌的点数之和 */
export function sumPoints(cards: Card[]): number {
  return cards.reduce((acc, c) => acc + cardPoint(c), 0);
}
