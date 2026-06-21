/** 房间状态 */
export type RoomStatus = 'waiting' | 'playing' | 'closed';

/** 玩法模式(v1 仅抢庄斗牛) */
export type RoomMode = 'rob_banker';

/** 座位状态 */
export type SeatStatus = 'sitting' | 'ready' | 'playing';

/** 房间配置 */
export interface RoomConfig {
  name: string;
  baseScore: number;
  maxPlayers: number;
  mode: RoomMode;
  minChips: number;
}

/** 房间 */
export interface Room {
  id: string;
  roomCode: string;
  name: string;
  ownerId: string;
  baseScore: number;
  maxPlayers: number;
  mode: RoomMode;
  minChips: number;
  status: RoomStatus;
}

/** 座位 */
export interface Seat {
  roomId: string;
  userId: string;
  seatNo: number;
  status: SeatStatus;
  chipsIn: number;
}

/** 房间 + 座位快照 */
export interface RoomWithSeats {
  room: Room;
  seats: Seat[];
}
