import type { HandResult, SeatId, SettleResult } from '@bullfighting/core';
import type { RoundSettlementContext, SettlementPlayer } from './types';

/** 一名玩家在结算前的元信息(由对局状态机提供) */
export interface SettlementSeatInput {
  /** 用户/座位 id */
  seatId: SeatId;
  /** 座位号 */
  seatNo: number;
  /** 该玩家手牌的评估结果(含牛型、牛值、原始 5 张) */
  hand: HandResult;
  /** 是否庄家 */
  isBanker: boolean;
  /** 闲家下注倍数(庄家可填 1) */
  betMultiplier: number;
  /** 抢庄倍数(闲家可填 1) */
  robMultiplier: number;
}

/** 构造结算上下文所需的整局信息 */
export interface BuildContextInput {
  roomId: SeatId;
  roundNo: number;
  bankerSeatId: SeatId | null;
  baseScore: number;
  shuffleSeed?: string | null;
  shuffleProof?: string | null;
  seats: SettlementSeatInput[];
  /** @bullfighting/core settle() 的结果(deltas 为零和) */
  settlement: SettleResult;
}

/**
 * 由对局结算结果 + 各座位元信息构造落库用的 {@link RoundSettlementContext}。
 *
 * 这是“对局逻辑(@bullfighting/core / 未来的 @bullfighting/game)→ 落库”的纯映射:
 * 把 HandResult 拆成 niuType/niuValue/cards,并从 SettleResult.deltas 取 resultChips。
 * 不触达数据库,便于单测。
 */
export function buildSettlementContext(input: BuildContextInput): RoundSettlementContext {
  const players: SettlementPlayer[] = input.seats.map((seat) => ({
    userId: seat.seatId,
    seatNo: seat.seatNo,
    cards: seat.hand.cards,
    niuType: seat.hand.type,
    niuValue: seat.hand.niuValue,
    isBanker: seat.isBanker,
    betMultiplier: seat.betMultiplier,
    robMultiplier: seat.robMultiplier,
    resultChips: input.settlement.deltas.get(seat.seatId) ?? 0,
  }));

  return {
    roomId: input.roomId,
    roundNo: input.roundNo,
    bankerSeatId: input.bankerSeatId,
    baseScore: input.baseScore,
    shuffleSeed: input.shuffleSeed ?? null,
    shuffleProof: input.shuffleProof ?? null,
    players,
  };
}
