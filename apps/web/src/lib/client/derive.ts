/**
 * 由房间快照派生一个"等待中"的对局公开状态。
 *
 * 用途:后端尚未开局(/api/game/[roomId]/sync 返回 404)时,牌桌仍能用真实座位
 * 渲染为 waiting 阶段;开局后 /sync 与实时频道会用真实对局态覆盖它。
 * 形状严格对齐后端 PublicGameState / PublicGamePlayer(不含 nickname / 筹码)。
 */
import type { PublicGameState, PublicPlayer, RoomWithSeats } from './types';

/** 座位 → 等待中的玩家(无手牌、无决策) */
function seatToWaitingPlayer(seat: RoomWithSeats['seats'][number]): PublicPlayer {
  return {
    seatId: seat.userId,
    seatNo: seat.seatNo,
    isBanker: false,
    robMultiplier: null,
    betMultiplier: null,
    revealed: false,
    hasActed: false,
    cards: null,
    hand: null,
    resultChips: null,
  };
}

/** 由房间 + 座位派生 waiting 态 */
export function deriveWaitingState(data: RoomWithSeats): PublicGameState {
  const players = [...data.seats].sort((a, b) => a.seatNo - b.seatNo).map(seatToWaitingPlayer);

  return {
    roomId: data.room.id,
    roundNo: 0,
    phase: 'waiting',
    baseScore: data.room.baseScore,
    deadline: null,
    bankerSeatId: null,
    players,
  };
}
