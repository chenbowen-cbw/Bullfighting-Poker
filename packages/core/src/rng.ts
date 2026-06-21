/** 随机数生成器:返回 [0, 1) 的浮点数 */
export type RNG = () => number;

/**
 * 确定性 PRNG(mulberry32)。
 * 用于可复现的单元测试,以及"可验证洗牌"(把种子记入牌局以便审计)。
 */
export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 加密级随机源(生产洗牌默认)。
 * 基于 Web Crypto(Node 18+ / 浏览器均为全局可用)。
 */
export const cryptoRng: RNG = () => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 4294967296;
};
