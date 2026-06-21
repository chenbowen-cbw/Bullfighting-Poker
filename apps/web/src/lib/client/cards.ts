/**
 * 牌面 / 牛型展示工具(纯函数,便于单测)。
 */
import type { Card, NiuType, Rank, Suit } from './types';

/** 花色 → emoji 符号 */
export const SUIT_SYMBOL: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  C: '♣',
  D: '♦',
};

/** 花色 → 中文名 */
export const SUIT_NAME: Record<Suit, string> = {
  S: '黑桃',
  H: '红桃',
  C: '梅花',
  D: '方块',
};

/** 红色花色(♥♦)用红,黑色花色(♠♣)用黑 */
export function isRedSuit(suit: Suit): boolean {
  return suit === 'H' || suit === 'D';
}

/** 牌面点数 → 展示文字(A / 2..10 / J / Q / K) */
export function rankLabel(rank: Rank): string {
  switch (rank) {
    case 1:
      return 'A';
    case 11:
      return 'J';
    case 12:
      return 'Q';
    case 13:
      return 'K';
    default:
      return String(rank);
  }
}

/** 一张牌的无障碍文案,如 "红桃A" */
export function cardLabel(card: Card): string {
  return `${SUIT_NAME[card.suit]}${rankLabel(card.rank)}`;
}

/** 牛型 → 中文短名(用于徽章) */
export const NIU_LABEL: Record<NiuType, string> = {
  NONE: '没牛',
  NIU_1: '牛1',
  NIU_2: '牛2',
  NIU_3: '牛3',
  NIU_4: '牛4',
  NIU_5: '牛5',
  NIU_6: '牛6',
  NIU_7: '牛7',
  NIU_8: '牛8',
  NIU_9: '牛9',
  NIU_NIU: '牛牛',
  WU_HUA_NIU: '五花牛',
  BOMB: '四炸',
  WU_XIAO_NIU: '五小牛',
};

/** 牛型 → 徽章配色(Tailwind 类名) */
export function niuBadgeClass(type: NiuType): string {
  switch (type) {
    case 'NONE':
      return 'bg-chalk text-ink/70';
    case 'NIU_NIU':
      return 'bg-bull text-chalk';
    case 'WU_HUA_NIU':
    case 'WU_XIAO_NIU':
    case 'BOMB':
      return 'bg-grape text-chalk';
    default:
      // 牛1..牛9:越大越暖
      return 'bg-sunny text-ink';
  }
}

/** 是否为特殊大牌型(用于加点闪光) */
export function isSpecialNiu(type: NiuType): boolean {
  return type === 'NIU_NIU' || type === 'WU_HUA_NIU' || type === 'WU_XIAO_NIU' || type === 'BOMB';
}
