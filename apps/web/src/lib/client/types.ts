/**
 * 前端使用的 DTO 类型。
 *
 * 说明:本里程碑(M6 前端)聚焦 UI。对局后端(M4/M5,/api/game/*、/api/realtime/token)
 * 在当前分支尚未落地,因此这里按"已公布的接口契约"定义对局公开状态类型,
 * 供牌桌 UI 与实时订阅直接使用——后端一旦上线即可零改动对接。
 *
 * 认证 / 房间相关类型与现有 API 的真实返回保持一致。
 */

// ───────────────────────── 认证 ─────────────────────────

/** 对外公开用户信息(与 @bullfighting/auth 的 PublicUser 对齐) */
export interface PublicUser {
  id: string;
  username: string;
  nickname: string;
  chips: number;
  status: string;
}

/** 注册/登录返回 */
export interface AuthResult {
  user: PublicUser;
  token: string;
}

// ───────────────────────── 房间 / 大厅 ─────────────────────────

export type RoomStatus = 'waiting' | 'playing' | 'closed';
export type RoomMode = 'rob_banker';
export type SeatStatus = 'sitting' | 'ready' | 'playing';

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

export interface Seat {
  roomId: string;
  userId: string;
  seatNo: number;
  status: SeatStatus;
  chipsIn: number;
}

export interface RoomWithSeats {
  room: Room;
  seats: Seat[];
}

/** 快速匹配结果 */
export type QuickMatchResult = { status: 'matched'; room: RoomWithSeats } | { status: 'queued' };

// ───────────────────────── 对局公开状态 ─────────────────────────

/** 对局阶段 */
export type GamePhase = 'waiting' | 'rob_banker' | 'betting' | 'reveal' | 'settled';

/** 花色(与 @bullfighting/core 的 Suit 取值一致) */
export type Suit = 'S' | 'H' | 'C' | 'D';

/** 牌面点数:A=1 … K=13 */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

/** 一张牌 */
export interface Card {
  suit: Suit;
  rank: Rank;
}

/** 牛型(与 @bullfighting/core 的 NiuType 取值一致) */
export type NiuType =
  | 'NONE'
  | 'NIU_1'
  | 'NIU_2'
  | 'NIU_3'
  | 'NIU_4'
  | 'NIU_5'
  | 'NIU_6'
  | 'NIU_7'
  | 'NIU_8'
  | 'NIU_9'
  | 'NIU_NIU'
  | 'WU_HUA_NIU'
  | 'BOMB'
  | 'WU_XIAO_NIU';

/** 对局中的一名玩家(公开视图) */
export interface PublicPlayer {
  /** 用户 id */
  userId: string;
  /** 座位号 */
  seatId: number;
  /** 昵称 */
  nickname: string;
  /** 当前筹码 */
  chips: number;
  /** 手牌:仅本人可见,或亮牌(reveal/settled)后全部可见;不可见时为 null */
  cards: Card[] | null;
  /** 抢庄倍数(0=不抢);未决策为 null */
  robMultiplier: number | null;
  /** 闲家下注倍数;未决策为 null */
  betMultiplier: number | null;
  /** 牛型(亮牌后);未揭晓为 null */
  niuType: NiuType | null;
  /** 本局盈亏(结算后);未结算为 null */
  delta: number | null;
  /** 是否已离线/托管 */
  ready?: boolean;
}

/** 对局公开状态(GET /api/game/[roomId]/sync 与实时 game:state 的 payload) */
export interface PublicGameState {
  roomId: string;
  /** 牌局序号(用于区分一局局) */
  round: number;
  /** 当前阶段 */
  phase: GamePhase;
  /** 底分 */
  baseScore: number;
  /** 当前阶段截止时间(epoch ms);无限制为 null */
  deadline: number | null;
  /** 庄家座位号;未定庄为 null */
  bankerSeatId: number | null;
  /** 玩家列表(按座位号) */
  players: PublicPlayer[];
}
