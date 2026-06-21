import { describe, it, expect } from 'vitest';
import { createDeck } from '../src/deck';
import { evaluate } from '../src/evaluator';
import { cardPoint } from '../src/points';
import { type Card, NiuType } from '../src/types';
import {
  DEFAULT_RULE_CONFIG,
  DEFAULT_MULTIPLIERS,
  DEFAULT_WEIGHTS,
  WU_XIAO_MAX_CARD_POINT,
  WU_XIAO_MAX_TOTAL,
} from '../src/config';

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

/**
 * 独立的牛型判定 oracle —— 故意用与 evaluate 不同的写法(三重嵌套枚举),
 * 用于交叉验证。两套独立实现在全部 260 万手牌上一致 = 强信心。
 */
function classify(cards: Card[]): { type: NiuType; niuValue: number } {
  const pts = cards.map(cardPoint);
  const total = pts.reduce((a, b) => a + b, 0);

  if (pts.every((p) => p <= WU_XIAO_MAX_CARD_POINT) && total <= WU_XIAO_MAX_TOTAL) {
    return { type: NiuType.WuXiaoNiu, niuValue: -1 };
  }
  const counts: Record<number, number> = {};
  for (const card of cards) counts[card.rank] = (counts[card.rank] ?? 0) + 1;
  if (Object.values(counts).some((n) => n === 4)) {
    return { type: NiuType.Bomb, niuValue: -1 };
  }
  if (cards.every((card) => card.rank >= 11)) {
    return { type: NiuType.WuHuaNiu, niuValue: -1 };
  }

  let best = -1;
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 4; j++) {
      for (let k = j + 1; k < 5; k++) {
        if ((pts[i] + pts[j] + pts[k]) % 10 !== 0) continue;
        const rem = [0, 1, 2, 3, 4].filter((x) => x !== i && x !== j && x !== k);
        const v = (pts[rem[0]] + pts[rem[1]]) % 10;
        const score = v === 0 ? 10 : v;
        const bestScore = best === -1 ? -1 : best === 0 ? 10 : best;
        if (score > bestScore) best = v;
      }
    }
  }
  if (best < 0) return { type: NiuType.None, niuValue: -1 };
  return { type: NIU_BY_VALUE[best], niuValue: best };
}

describe('evaluate 穷举校验', () => {
  it('全部 C(52,5)=2,598,960 手牌:与独立 oracle 一致且结构不变量成立', () => {
    const deck = createDeck();
    let count = 0;
    const typeCount = new Map<NiuType, number>();

    for (let a = 0; a < 48; a++) {
      for (let b = a + 1; b < 49; b++) {
        for (let cc = b + 1; cc < 50; cc++) {
          for (let d = cc + 1; d < 51; d++) {
            for (let e = d + 1; e < 52; e++) {
              const cards = [deck[a], deck[b], deck[cc], deck[d], deck[e]];
              const r = evaluate(cards, DEFAULT_RULE_CONFIG);
              const o = classify(cards);

              if (r.type !== o.type || r.niuValue !== o.niuValue) {
                throw new Error(
                  `判定不一致: evaluate=${r.type}/${r.niuValue} oracle=${o.type}/${o.niuValue} 牌=${JSON.stringify(cards)}`,
                );
              }
              if (
                r.weight !== DEFAULT_WEIGHTS[r.type] ||
                r.multiplier !== DEFAULT_MULTIPLIERS[r.type]
              ) {
                throw new Error(`权重/倍率不符: ${r.type}`);
              }

              if (r.niuValue >= 0) {
                if (!r.bullCards || !r.pointCards) throw new Error('普通牛缺少分组');
                if (r.bullCards.length !== 3 || r.pointCards.length !== 2) {
                  throw new Error('分组数量错误');
                }
                const bull = r.bullCards.reduce((s, x) => s + cardPoint(x), 0);
                const point = r.pointCards.reduce((s, x) => s + cardPoint(x), 0);
                if (bull % 10 !== 0) throw new Error('bull 之和不是 10 的倍数');
                if (point % 10 !== r.niuValue) throw new Error('point 之和与 niuValue 不符');
              } else if (r.bullCards || r.pointCards) {
                throw new Error('非普通牛不应携带分组');
              }

              typeCount.set(r.type, (typeCount.get(r.type) ?? 0) + 1);
              count += 1;
            }
          }
        }
      }
    }

    expect(count).toBe(2598960);
    // 健全性:各主要牌型都应出现(精确分布由逐手 oracle 校验保证)
    for (const t of [
      NiuType.NiuNiu,
      NiuType.None,
      NiuType.Bomb,
      NiuType.WuXiaoNiu,
      NiuType.WuHuaNiu,
    ]) {
      expect(typeCount.get(t) ?? 0).toBeGreaterThan(0);
    }
  }, 300000);
});
