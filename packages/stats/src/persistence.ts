import type {
  RoundPersistence,
  RoundPlayerRow,
  RoundRow,
  RoundSettlementContext,
  SettlementPlayer,
  UserStatsDelta,
} from './types';

/** round_players 落库时使用的固定结束阶段 */
export const SETTLED_PHASE = 'settled';

/** 由单个玩家结算上下文推导其 round_players 行 */
function toRoundPlayerRow(p: SettlementPlayer): RoundPlayerRow {
  return {
    userId: p.userId,
    seatNo: p.seatNo,
    cards: p.cards ?? null,
    niuType: p.niuType ?? null,
    niuValue: p.niuValue ?? null,
    isBanker: p.isBanker,
    betMultiplier: p.betMultiplier,
    robMultiplier: p.robMultiplier,
    resultChips: p.resultChips,
  };
}

/** 由单个玩家结算上下文推导其 user_stats 增量 */
function toStatsDelta(p: SettlementPlayer): UserStatsDelta {
  const net = p.resultChips;
  return {
    userId: p.userId,
    roundsPlayed: 1,
    roundsWon: net > 0 ? 1 : 0,
    bankerRounds: p.isBanker ? 1 : 0,
    totalWon: net > 0 ? net : 0,
    totalLost: net < 0 ? -net : 0,
    roundNet: net,
  };
}

/**
 * 纯函数:从一局**已结算**的上下文推导出 rounds / round_players / user_stats
 * 的写入载荷。无副作用、不触达数据库,便于单测。
 *
 * - rounds:写入一行,phase 固定为 {@link SETTLED_PHASE}。
 * - round_players:每个参与玩家一行,cards/niuType/niuValue/倍数/resultChips 原样落盘。
 * - user_stats:每个玩家一条增量;roundsWon 以 resultChips > 0 判定;
 *   totalWon/totalLost 分别累加正/负净额;roundNet 供落库层刷新 biggestWin。
 */
export function computeRoundPersistence(ctx: RoundSettlementContext): RoundPersistence {
  const round: RoundRow = {
    roomId: ctx.roomId,
    roundNo: ctx.roundNo,
    bankerUserId: ctx.bankerSeatId ?? null,
    shuffleSeed: ctx.shuffleSeed ?? null,
    shuffleProof: ctx.shuffleProof ?? null,
    phase: SETTLED_PHASE,
  };

  const roundPlayers = ctx.players.map(toRoundPlayerRow);
  const statsDeltas = ctx.players.map(toStatsDelta);

  return { round, roundPlayers, statsDeltas };
}
