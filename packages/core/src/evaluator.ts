import { type Card, type HandResult, type Rank, NiuType, SUIT_ORDER } from './types';
import { cardPoint } from './points';
import {
  type RuleConfig,
  DEFAULT_RULE_CONFIG,
  WU_XIAO_MAX_CARD_POINT,
  WU_XIAO_MAX_TOTAL,
} from './config';

/** 牌的比较序:先比点数(A<…<K),再比花色(♠>♥>♣>♦),保证任意两张不同牌严格可比 */
export function cardOrder(card: Card): number {
  return card.rank * 10 + SUIT_ORDER[card.suit];
}

/** 取一组牌中的最大单张 */
export function maxCardOf(cards: Card[]): Card {
  return cards.reduce((best, c) => (cardOrder(c) > cardOrder(best) ? c : best));
}

/** C(5,3) 的全部 10 种三张组合(索引) */
const TRIPLES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2],
  [0, 1, 3],
  [0, 1, 4],
  [0, 2, 3],
  [0, 2, 4],
  [0, 3, 4],
  [1, 2, 3],
  [1, 2, 4],
  [1, 3, 4],
  [2, 3, 4],
];

/** 牛值 → 牛型(0=牛牛,1..9=牛1..牛9) */
const NIU_BY_VALUE: readonly NiuType[] = [
  NiuType.NiuNiu,
  NiuType.Niu1,
  NiuType.Niu2,
  NiuType.Niu3,
  NiuType.Niu4,
  NiuType.Niu5,
  NiuType.Niu6,
  NiuType.Niu7,
  NiuType.Niu8,
  NiuType.Niu9,
];

/** 把"牛值"换算成可比较的分数:牛牛(0)最大 */
function niuScore(value: number): number {
  if (value < 0) return -1;
  return value === 0 ? 10 : value;
}

function specialResult(
  type: NiuType,
  cards: Card[],
  maxCard: Card,
  config: RuleConfig,
  bombRank: Rank | null,
): HandResult {
  return {
    cards,
    type,
    niuValue: -1,
    weight: config.weights[type],
    multiplier: config.multipliers[type],
    bullCards: null,
    pointCards: null,
    maxCard,
    bombRank,
  };
}

/**
 * 评定 5 张牌的牛型。
 *
 * 判定优先级(从高到低):五小牛 → 四炸 → 五花牛 → 普通牛/没牛。
 * 普通牛在存在多种成牛组合时取最优(牛值最大)。
 */
export function evaluate(cards: Card[], config: RuleConfig = DEFAULT_RULE_CONFIG): HandResult {
  if (cards.length !== 5) {
    throw new Error(`斗牛需要正好 5 张牌,收到 ${cards.length} 张`);
  }
  for (let x = 0; x < 5; x++) {
    for (let y = x + 1; y < 5; y++) {
      if (cards[x].suit === cards[y].suit && cards[x].rank === cards[y].rank) {
        throw new Error('手牌中存在重复牌');
      }
    }
  }

  const maxCard = maxCardOf(cards);
  const points = cards.map(cardPoint);
  const total = points.reduce((a, b) => a + b, 0);

  // —— 特殊牌型(按权重从高到低判定) ——
  if (
    config.enableWuXiaoNiu &&
    points.every((p) => p <= WU_XIAO_MAX_CARD_POINT) &&
    total <= WU_XIAO_MAX_TOTAL
  ) {
    return specialResult(NiuType.WuXiaoNiu, cards, maxCard, config, null);
  }

  if (config.enableBomb) {
    const counts = new Map<Rank, number>();
    let bombRank: Rank | null = null;
    for (const c of cards) {
      const n = (counts.get(c.rank) ?? 0) + 1;
      counts.set(c.rank, n);
      if (n === 4) bombRank = c.rank;
    }
    if (bombRank !== null) {
      return specialResult(NiuType.Bomb, cards, maxCard, config, bombRank);
    }
  }

  if (config.enableWuHuaNiu && cards.every((c) => c.rank >= 11)) {
    return specialResult(NiuType.WuHuaNiu, cards, maxCard, config, null);
  }

  // —— 普通牛:在所有成牛组合中取牛值最大者 ——
  let bestValue = -1;
  let bestBull: Card[] | null = null;
  let bestPoint: Card[] | null = null;

  for (const [i, j, k] of TRIPLES) {
    if ((points[i] + points[j] + points[k]) % 10 !== 0) continue;
    const rem: number[] = [];
    for (let x = 0; x < 5; x++) {
      if (x !== i && x !== j && x !== k) rem.push(x);
    }
    const value = (points[rem[0]] + points[rem[1]]) % 10;
    if (niuScore(value) > niuScore(bestValue)) {
      bestValue = value;
      bestBull = [cards[i], cards[j], cards[k]];
      bestPoint = [cards[rem[0]], cards[rem[1]]];
    }
  }

  if (bestValue < 0) {
    return {
      cards,
      type: NiuType.None,
      niuValue: -1,
      weight: config.weights[NiuType.None],
      multiplier: config.multipliers[NiuType.None],
      bullCards: null,
      pointCards: null,
      maxCard,
      bombRank: null,
    };
  }

  const type = NIU_BY_VALUE[bestValue];
  return {
    cards,
    type,
    niuValue: bestValue,
    weight: config.weights[type],
    multiplier: config.multipliers[type],
    bullCards: bestBull,
    pointCards: bestPoint,
    maxCard,
    bombRank: null,
  };
}
