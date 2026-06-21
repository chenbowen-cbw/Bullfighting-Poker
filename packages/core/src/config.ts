import { NiuType } from './types';

/** 规则配置(倍率、权重、特殊牌型开关均可调) */
export interface RuleConfig {
  /** 是否启用五小牛 */
  enableWuXiaoNiu: boolean;
  /** 是否启用四炸 */
  enableBomb: boolean;
  /** 是否启用五花牛 */
  enableWuHuaNiu: boolean;
  /** 各牌型结算倍率 */
  multipliers: Record<NiuType, number>;
  /** 各牌型比牌权重(越大越大) */
  weights: Record<NiuType, number>;
}

/** 默认结算倍率:没牛~牛6=1,牛7/8=2,牛9/牛牛=3,五花牛/四炸=4,五小牛=5 */
export const DEFAULT_MULTIPLIERS: Record<NiuType, number> = {
  [NiuType.None]: 1,
  [NiuType.Niu1]: 1,
  [NiuType.Niu2]: 1,
  [NiuType.Niu3]: 1,
  [NiuType.Niu4]: 1,
  [NiuType.Niu5]: 1,
  [NiuType.Niu6]: 1,
  [NiuType.Niu7]: 2,
  [NiuType.Niu8]: 2,
  [NiuType.Niu9]: 3,
  [NiuType.NiuNiu]: 3,
  [NiuType.WuHuaNiu]: 4,
  [NiuType.Bomb]: 4,
  [NiuType.WuXiaoNiu]: 5,
};

/** 默认比牌权重:五小牛 > 四炸 > 五花牛 > 牛牛 > 牛9 … 牛1 > 没牛 */
export const DEFAULT_WEIGHTS: Record<NiuType, number> = {
  [NiuType.None]: 0,
  [NiuType.Niu1]: 1,
  [NiuType.Niu2]: 2,
  [NiuType.Niu3]: 3,
  [NiuType.Niu4]: 4,
  [NiuType.Niu5]: 5,
  [NiuType.Niu6]: 6,
  [NiuType.Niu7]: 7,
  [NiuType.Niu8]: 8,
  [NiuType.Niu9]: 9,
  [NiuType.NiuNiu]: 10,
  [NiuType.WuHuaNiu]: 11,
  [NiuType.Bomb]: 12,
  [NiuType.WuXiaoNiu]: 13,
};

/** 默认规则配置 */
export const DEFAULT_RULE_CONFIG: RuleConfig = {
  enableWuXiaoNiu: true,
  enableBomb: true,
  enableWuHuaNiu: true,
  multipliers: DEFAULT_MULTIPLIERS,
  weights: DEFAULT_WEIGHTS,
};

/** 五小牛阈值:每张点数 ≤ 此值 */
export const WU_XIAO_MAX_CARD_POINT = 4;
/** 五小牛阈值:5 张点数总和 ≤ 此值 */
export const WU_XIAO_MAX_TOTAL = 10;
