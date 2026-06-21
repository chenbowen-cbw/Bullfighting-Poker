import { type Card, type Rank, Suit } from './types';
import { type RNG, cryptoRng } from './rng';

/** 标准花色顺序 */
export const SUITS: readonly Suit[] = [Suit.Spades, Suit.Hearts, Suit.Clubs, Suit.Diamonds];
/** 标准牌面顺序 A..K */
export const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

/** 生成一副标准 52 张牌(固定顺序) */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/** Fisher–Yates 洗牌,返回新数组,不修改入参 */
export function shuffle<T>(cards: readonly T[], rng: RNG = cryptoRng): T[] {
  const a = cards.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

/** 发牌结果 */
export interface DealResult {
  /** 每位玩家的手牌 */
  hands: Card[][];
  /** 剩余牌堆 */
  rest: Card[];
}

/**
 * 逐张轮流发牌(更贴近真实发牌过程)。
 * @param deck 牌堆(通常为已洗好的牌)
 * @param numPlayers 玩家数
 * @param cardsEach 每人张数,斗牛固定为 5
 */
export function deal(deck: readonly Card[], numPlayers: number, cardsEach = 5): DealResult {
  if (numPlayers < 1) throw new Error('numPlayers 必须 ≥ 1');
  if (numPlayers * cardsEach > deck.length) throw new Error('牌不够发');

  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
  let idx = 0;
  for (let c = 0; c < cardsEach; c++) {
    for (let p = 0; p < numPlayers; p++) {
      hands[p].push(deck[idx]);
      idx += 1;
    }
  }
  return { hands, rest: deck.slice(idx) };
}
