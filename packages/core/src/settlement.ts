import type { HandResult } from './types';
import { compareHands } from './comparator';

/** 座位标识(用户/座位 id) */
export type SeatId = string | number;

/** 庄家结算条目 */
export interface BankerEntry {
  seatId: SeatId;
  hand: HandResult;
  /** 抢庄倍数,≥ 1 */
  robMultiplier: number;
}

/** 闲家结算条目 */
export interface PlayerEntry {
  seatId: SeatId;
  hand: HandResult;
  /** 闲家下注倍数,≥ 1 */
  betMultiplier: number;
}

/** 结算配置 */
export interface SettleConfig {
  /** 底分 */
  baseScore: number;
}

/** 单个闲家对庄家的结算明细 */
export interface SettleDetail {
  seatId: SeatId;
  result: 'win' | 'lose';
  /** 该闲家的净额(正=赢庄家,负=输给庄家) */
  amount: number;
}

/** 结算结果 */
export interface SettleResult {
  /** 每个座位的筹码增减(含庄家),总和恒为 0 */
  deltas: Map<SeatId, number>;
  /** 各闲家明细 */
  details: SettleDetail[];
}

/**
 * 抢庄斗牛结算:庄家逐一与每个闲家比牌。
 *
 * 单笔金额 = 底分 × 闲家下注倍数 × 庄家抢庄倍数 × 赢家牌型倍率。
 * 庄赢则庄家收、闲家付;闲赢反之。平局判庄家赢(单副牌实际不会平)。
 * 所有转移均为零和,结算后全场筹码守恒。
 */
export function settle(
  banker: BankerEntry,
  players: PlayerEntry[],
  config: SettleConfig,
): SettleResult {
  const deltas = new Map<SeatId, number>();
  const add = (id: SeatId, v: number): void => {
    deltas.set(id, (deltas.get(id) ?? 0) + v);
  };

  add(banker.seatId, 0);
  const details: SettleDetail[] = [];

  for (const p of players) {
    const cmp = compareHands(banker.hand, p.hand);
    const bankerWins = cmp >= 0;
    const winnerMultiplier = bankerWins ? banker.hand.multiplier : p.hand.multiplier;
    const unit = config.baseScore * p.betMultiplier * banker.robMultiplier;
    const amount = unit * winnerMultiplier;

    if (bankerWins) {
      add(banker.seatId, amount);
      add(p.seatId, -amount);
      details.push({ seatId: p.seatId, result: 'lose', amount: -amount });
    } else {
      add(banker.seatId, -amount);
      add(p.seatId, amount);
      details.push({ seatId: p.seatId, result: 'win', amount });
    }
  }

  return { deltas, details };
}
