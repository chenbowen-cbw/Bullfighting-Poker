/** 花色 */
export enum Suit {
  Spades = 'S', // 黑桃 ♠
  Hearts = 'H', // 红桃 ♥
  Clubs = 'C', // 梅花 ♣
  Diamonds = 'D', // 方块 ♦
}

/** 花色大小:♠ > ♥ > ♣ > ♦ */
export const SUIT_ORDER: Record<Suit, number> = {
  [Suit.Spades]: 4,
  [Suit.Hearts]: 3,
  [Suit.Clubs]: 2,
  [Suit.Diamonds]: 1,
};

/** 牌面:A=1, 2..10, J=11, Q=12, K=13 */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

/** 一张牌 */
export interface Card {
  suit: Suit;
  rank: Rank;
}

/** 牛型 */
export enum NiuType {
  None = 'NONE', // 没牛
  Niu1 = 'NIU_1',
  Niu2 = 'NIU_2',
  Niu3 = 'NIU_3',
  Niu4 = 'NIU_4',
  Niu5 = 'NIU_5',
  Niu6 = 'NIU_6',
  Niu7 = 'NIU_7',
  Niu8 = 'NIU_8',
  Niu9 = 'NIU_9',
  NiuNiu = 'NIU_NIU', // 牛牛
  WuHuaNiu = 'WU_HUA_NIU', // 五花牛(全 JQK)
  Bomb = 'BOMB', // 四炸(四张同点)
  WuXiaoNiu = 'WU_XIAO_NIU', // 五小牛
}

/** 评牌结果 */
export interface HandResult {
  /** 原始 5 张牌 */
  cards: Card[];
  /** 牛型 */
  type: NiuType;
  /** 牛值:牛牛=0,牛1..牛9=1..9,非普通牛型=-1 */
  niuValue: number;
  /** 比牌权重(越大越大) */
  weight: number;
  /** 结算倍率 */
  multiplier: number;
  /** 成牛的三张(仅普通牛型,否则 null) */
  bullCards: Card[] | null;
  /** 计点的两张(仅普通牛型,否则 null) */
  pointCards: Card[] | null;
  /** 同型比牌用的最大单张 */
  maxCard: Card;
  /** 四炸的四条点数(仅 Bomb,否则 null) */
  bombRank: Rank | null;
}
