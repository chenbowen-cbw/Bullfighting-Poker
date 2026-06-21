import { DEFAULT_RULE_CONFIG, type RuleConfig } from '@bullfighting/core';

/** 对局参数(随状态一并持久化,保证可序列化) */
export interface GameConfig {
  /** 最大抢庄倍数 */
  maxRob: number;
  /** 最大下注倍数 */
  maxBet: number;
  /** 抢庄阶段时长(毫秒) */
  robMillis: number;
  /** 下注阶段时长(毫秒) */
  betMillis: number;
  /** 亮牌阶段时长(毫秒) */
  revealMillis: number;
  /** 结算停留时长(毫秒) */
  settledMillis: number;
  /** 开局最少人数 */
  minPlayers: number;
  /** 牛型规则(倍率/权重/特殊牌型) */
  rule: RuleConfig;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  maxRob: 4,
  maxBet: 5,
  robMillis: 15000,
  betMillis: 15000,
  revealMillis: 15000,
  settledMillis: 8000,
  minPlayers: 2,
  rule: DEFAULT_RULE_CONFIG,
};
