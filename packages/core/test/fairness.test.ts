import { describe, it, expect } from 'vitest';
import { createDeck, shuffle } from '../src/deck';
import { mulberry32 } from '../src/rng';
import type { Card } from '../src/types';

/**
 * 洗牌公平性 / 均匀性测试。
 *
 * 目标:用可复现 PRNG(mulberry32 + 固定种子)做大量洗牌,
 * 通过卡方与分布健全性检查,验证 Fisher–Yates 洗牌没有明显偏置。
 *
 * 注意:
 * - 全部使用固定种子,结果完全确定,不会 flaky。
 * - 仅在本测试文件内进行统计,不修改 core 源码。
 * - 卡方阈值取得足够宽松(留出充足余量),只用于捕捉"系统性偏置",
 *   而非把正常的随机波动判为失败。
 */

/** 牌的稳定字符串键,如 "S10"、"H13" */
const key = (c: Card): string => `${c.suit}${c.rank}`;

const DECK = createDeck();
const DECK_KEYS = DECK.map(key);
const N = DECK.length; // 52

/**
 * 卡方上临界值(右尾),用于"观测分布是否显著偏离均匀"的检验。
 * 数值取自卡方分布表的上 0.1% 分位(α=0.001),宁可放宽也不要误报。
 * key 为自由度 df。
 */
const CHI2_UPPER_CRITICAL: Record<number, number> = {
  51: 90.0, // df=51,上 0.001 分位约 89.27,这里取 90 留余量
  2550: 2750, // df=2550(52*52-52 的同量级),取保守上界
};

describe('洗牌公平性(均匀性)', () => {
  it('每个位置上各牌面出现频次近似均匀(逐位卡方检验)', () => {
    const trials = 200_000;
    const rng = mulberry32(0x9e3779b1);

    // counts[pos][cardIndex] = 在位置 pos 上出现该牌的次数
    const counts: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0));
    const indexOf = new Map<string, number>(DECK_KEYS.map((k, i) => [k, i]));

    for (let t = 0; t < trials; t++) {
      const shuffled = shuffle(DECK, rng);
      for (let pos = 0; pos < N; pos++) {
        const ci = indexOf.get(key(shuffled[pos]))!;
        counts[pos][ci] += 1;
      }
    }

    // 期望:每个 (位置, 牌) 组合出现 trials / N 次
    const expected = trials / N;

    // 对每个位置做一次卡方检验(df = N - 1 = 51)
    const df = N - 1;
    const critical = CHI2_UPPER_CRITICAL[df];
    let maxChi2 = 0;

    for (let pos = 0; pos < N; pos++) {
      let chi2 = 0;
      let rowSum = 0;
      for (let ci = 0; ci < N; ci++) {
        const o = counts[pos][ci];
        rowSum += o;
        const diff = o - expected;
        chi2 += (diff * diff) / expected;
      }
      // 每个位置恰好被填充 trials 次
      expect(rowSum).toBe(trials);
      maxChi2 = Math.max(maxChi2, chi2);
      expect(chi2).toBeLessThan(critical);
    }

    // 额外健全性:最坏位置也应远低于临界值(信息性断言)
    expect(maxChi2).toBeLessThan(critical);
  });

  it('单张牌在各位置的落点分布近似均匀(整体卡方检验)', () => {
    const trials = 200_000;
    const rng = mulberry32(0x1234_5678);

    // 跟踪首张牌(黑桃A,DECK[0])落在每个位置的次数
    const targetKey = DECK_KEYS[0];
    const posCounts = new Array<number>(N).fill(0);

    for (let t = 0; t < trials; t++) {
      const shuffled = shuffle(DECK, rng);
      for (let pos = 0; pos < N; pos++) {
        if (key(shuffled[pos]) === targetKey) {
          posCounts[pos] += 1;
          break;
        }
      }
    }

    const expected = trials / N;
    let chi2 = 0;
    let total = 0;
    for (let pos = 0; pos < N; pos++) {
      total += posCounts[pos];
      const diff = posCounts[pos] - expected;
      chi2 += (diff * diff) / expected;
    }

    expect(total).toBe(trials);
    expect(chi2).toBeLessThan(CHI2_UPPER_CRITICAL[N - 1]);
  });

  it('置换不被恒等支配:固定首张牌的概率接近 1/52', () => {
    const trials = 100_000;
    const rng = mulberry32(0xdead_beef);

    let firstUnchanged = 0;
    for (let t = 0; t < trials; t++) {
      const shuffled = shuffle(DECK, rng);
      if (key(shuffled[0]) === DECK_KEYS[0]) firstUnchanged += 1;
    }

    const ratio = firstUnchanged / trials;
    // 期望 1/52 ≈ 0.01923,允许 ±0.006 的统计波动(固定种子下稳定满足)
    expect(ratio).toBeGreaterThan(1 / N - 0.006);
    expect(ratio).toBeLessThan(1 / N + 0.006);
  });

  it('相邻牌相对顺序无偏:P(A 在 B 之前) 接近 1/2', () => {
    const trials = 100_000;
    const rng = mulberry32(0x0bad_f00d);

    // 取两张固定的牌:黑桃A(DECK[0])与方块K(DECK[N-1])
    const aKey = DECK_KEYS[0];
    const bKey = DECK_KEYS[N - 1];

    let aBeforeB = 0;
    for (let t = 0; t < trials; t++) {
      const shuffled = shuffle(DECK, rng);
      let posA = -1;
      let posB = -1;
      for (let i = 0; i < N; i++) {
        const k = key(shuffled[i]);
        if (k === aKey) posA = i;
        else if (k === bKey) posB = i;
        if (posA >= 0 && posB >= 0) break;
      }
      if (posA < posB) aBeforeB += 1;
    }

    const ratio = aBeforeB / trials;
    // 期望 0.5,允许 ±0.01 波动(固定种子稳定满足)
    expect(ratio).toBeGreaterThan(0.5 - 0.01);
    expect(ratio).toBeLessThan(0.5 + 0.01);
  });

  it('洗牌总是 52 张的合法置换(不丢牌不重牌)', () => {
    const rng = mulberry32(0xc0ffee);
    for (let t = 0; t < 2_000; t++) {
      const shuffled = shuffle(DECK, rng);
      expect(shuffled).toHaveLength(N);
      expect(new Set(shuffled.map(key)).size).toBe(N);
    }
  });
});
