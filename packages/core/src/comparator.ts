import { type HandResult, NiuType } from './types';
import { cardOrder } from './evaluator';

/**
 * 比较两手牌的大小。
 * @returns >0 表示 a 大,<0 表示 b 大,0 表示完全相等(实际单副牌对局中不会出现)
 *
 * 规则:先比牌型权重;同型时——四炸比四条点数,其余比最大单张(点数→花色)。
 */
export function compareHands(a: HandResult, b: HandResult): number {
  if (a.weight !== b.weight) {
    return Math.sign(a.weight - b.weight);
  }

  if (
    a.type === NiuType.Bomb &&
    b.type === NiuType.Bomb &&
    a.bombRank !== null &&
    b.bombRank !== null
  ) {
    if (a.bombRank !== b.bombRank) {
      return Math.sign(a.bombRank - b.bombRank);
    }
  }

  return Math.sign(cardOrder(a.maxCard) - cardOrder(b.maxCard));
}
