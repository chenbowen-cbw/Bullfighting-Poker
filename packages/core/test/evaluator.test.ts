import { describe, it, expect } from 'vitest';
import { evaluate } from '../src/evaluator';
import { NiuType } from '../src/types';
import { DEFAULT_RULE_CONFIG, DEFAULT_MULTIPLIERS, DEFAULT_WEIGHTS } from '../src/config';
import { cardPoint } from '../src/points';
import { c } from './helpers';

describe('evaluate 牌型判定', () => {
  it('牛牛(三张10 + 两张10)', () => {
    const r = evaluate([c('S', 10), c('H', 10), c('C', 10), c('D', 13), c('S', 12)]);
    expect(r.type).toBe(NiuType.NiuNiu);
    expect(r.niuValue).toBe(0);
    expect(r.multiplier).toBe(DEFAULT_MULTIPLIERS[NiuType.NiuNiu]);
  });

  it('牛9', () => {
    const r = evaluate([c('S', 5), c('H', 5), c('C', 5), c('D', 4), c('S', 10)]);
    expect(r.type).toBe(NiuType.Niu9);
    expect(r.niuValue).toBe(9);
  });

  it('牛1', () => {
    const r = evaluate([c('S', 1), c('H', 2), c('C', 3), c('D', 5), c('S', 10)]);
    expect(r.type).toBe(NiuType.Niu1);
    expect(r.niuValue).toBe(1);
  });

  it('没牛', () => {
    const r = evaluate([c('S', 1), c('H', 1), c('C', 2), c('D', 3), c('S', 9)]);
    expect(r.type).toBe(NiuType.None);
    expect(r.niuValue).toBe(-1);
    expect(r.bullCards).toBeNull();
  });

  it('五小牛(均≤4 且 总和≤10)', () => {
    const r = evaluate([c('S', 1), c('H', 1), c('C', 1), c('D', 2), c('S', 4)]);
    expect(r.type).toBe(NiuType.WuXiaoNiu);
    expect(r.weight).toBe(DEFAULT_WEIGHTS[NiuType.WuXiaoNiu]);
  });

  it('四炸(四张同点)', () => {
    const r = evaluate([c('S', 13), c('H', 13), c('C', 13), c('D', 13), c('S', 2)]);
    expect(r.type).toBe(NiuType.Bomb);
    expect(r.bombRank).toBe(13);
  });

  it('五花牛(全 JQK)', () => {
    const r = evaluate([c('S', 11), c('H', 12), c('C', 13), c('D', 11), c('S', 12)]);
    expect(r.type).toBe(NiuType.WuHuaNiu);
  });

  it('普通牛的 bull/point 分组正确', () => {
    const r = evaluate([c('S', 5), c('H', 5), c('C', 5), c('D', 4), c('S', 10)]);
    expect(r.bullCards).not.toBeNull();
    expect(r.pointCards).not.toBeNull();
    const bull = r.bullCards!.reduce((s, x) => s + cardPoint(x), 0);
    const point = r.pointCards!.reduce((s, x) => s + cardPoint(x), 0);
    expect(bull % 10).toBe(0);
    expect(point % 10).toBe(r.niuValue);
  });

  it('特殊牌型可通过配置关闭(关闭四炸后 KKKK2 视为普通牛)', () => {
    const cfg = { ...DEFAULT_RULE_CONFIG, enableBomb: false };
    const r = evaluate([c('S', 13), c('H', 13), c('C', 13), c('D', 13), c('S', 2)], cfg);
    expect(r.type).toBe(NiuType.Niu2); // 10+10+10=30 成牛,余 10+2=12 → 牛2
  });

  it('张数不对或有重复牌时抛错', () => {
    expect(() => evaluate([c('S', 1), c('H', 2), c('C', 3)])).toThrow();
    expect(() => evaluate([c('S', 1), c('S', 1), c('C', 3), c('D', 4), c('H', 5)])).toThrow();
  });
});
