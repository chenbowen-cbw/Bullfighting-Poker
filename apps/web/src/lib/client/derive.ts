/**
 * 由房间快照派生一个"等待中"的对局公开状态。
 *
 * 用途:对局后端(/api/game/*)尚未上线时,牌桌仍能用真实座位渲染,
 * 处于 waiting 阶段;后端上线后,/sync 与实时频道会用真实对局态覆盖它。
 */
import type { PublicGameState, PublicPlayer, RoomWithSeats } from './types';

/** 座位 → 等待中的玩家(无手牌、无决策) */
function seatToWaitingPlayer(seat: RoomWithSeats['seats'][number], nickname: string): PublicPlayer {
  return {
    userId: seat.userId,
    seatId: seat.seatNo,
    nickname,
    chips: seat.chipsIn,
    cards: null,
    robMultiplier: null,
    betMultiplier: null,
    niuType: null,
    delta: null,
  };
}

/**
 * @param data 房间 + 座位
 * @param nameOf 由 userId 取昵称(拿不到则回退到座位号)
 */
export function deriveWaitingState(
  data: RoomWithSeats,
  nameOf: (userId: string) => string | undefined,
): PublicGameState {
  const players = [...data.seats]
    .sort((a, b) => a.seatNo - b.seatNo)
    .map((s) => seatToWaitingPlayer(s, nameOf(s.userId) ?? `玩家${s.seatNo + 1}`));

  return {
    roomId: data.room.id,
    round: 0,
    phase: 'waiting',
    baseScore: data.room.baseScore,
    deadline: null,
    bankerSeatId: null,
    players,
  };
}
