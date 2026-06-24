import type { Card, HandResult } from '@bullfighting/core';
import type { GameConfig } from './config';

/** 对局阶段 */
export type GamePhase = 'waiting' | 'rob_banker' | 'betting' | 'reveal' | 'settled';

/** 局内玩家状态 */
export interface GamePlayer {
  seatId: string;
  seatNo: number;
  isBanker: boolean;
  /** 抢庄倍数(null=未抢) */
  robMultiplier: number | null;
  /** 下注倍数(null=未下;庄家恒为 null) */
  betMultiplier: number | null;
  /** 手牌(服务端持有;仅本人或亮牌后可见) */
  cards: Card[] | null;
  /** 评牌结果 */
  hand: HandResult | null;
  /** 是否已亮牌 */
  revealed: boolean;
  /** 本局结算盈亏 */
  resultChips: number | null;
}

/** 权威对局状态(可序列化,存于 Redis) */
export interface GameState {
  roomId: string;
  roundNo: number;
  phase: GamePhase;
  baseScore: number;
  bankerSeatId: string | null;
  players: GamePlayer[];
  /** 当前阶段截止时间(ms epoch) */
  deadline: number | null;
  config: GameConfig;
}

/** 对局动作(玩家动作携带 now 以推进截止时间) */
export type GameAction =
  | { type: 'START_ROUND'; now: number }
  | { type: 'ROB'; seatId: string; multiplier: number; now: number }
  | { type: 'BET'; seatId: string; multiplier: number; now: number }
  | { type: 'REVEAL'; seatId: string; now: number }
  | { type: 'TIMEOUT'; now: number }
  | { type: 'REMOVE_PLAYER'; seatId: string; now: number };

/** 单个座位的结算增减 */
export interface SettlementDelta {
  seatId: string;
  delta: number;
}

/** reducer 产生的副作用(由适配层执行) */
export type GameEffect =
  | { type: 'scheduleTimeout'; deadline: number }
  | { type: 'settle'; deltas: SettlementDelta[] };

/** applyAction 的返回:新状态 + 副作用 */
export interface ApplyResult {
  state: GameState;
  effects: GameEffect[];
}
