/**
 * 前端使用的 DTO 类型。
 *
 * 对局公开状态类型严格对齐后端 @bullfighting/game 的 `projectState` 输出
 * (PublicGameState / PublicGamePlayer):seatId 为字符串、牛型在 hand.type、
 * 盈亏在 resultChips、局号为 roundNo、bankerSeatId 为字符串;公开态不含
 * nickname / 当前筹码。认证 / 房间类型与现有 API 真实返回一致。
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

// ───────────────────────── 好友 ─────────────────────────

/** 对外公开的好友信息(与后端 @bullfighting/friends 的 PublicFriend 对齐) */
export interface PublicFriend {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
  chips: number;
  status: string;
}

/** 待处理好友请求(direction 区分收/发) */
export interface FriendRequest {
  id: string;
  direction: 'incoming' | 'outgoing';
  user: PublicFriend;
}

/** 好友请求列表返回 */
export interface FriendRequests {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
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

/** 评牌结果(后端 projectState 下发的字段子集) */
export interface HandResult {
  /** 牛型 */
  type: NiuType;
  /** 牛值:牛牛=0,牛1..9=1..9,特殊牌型=-1 */
  niuValue: number;
  /** 原始 5 张牌 */
  cards: Card[];
  /** 四炸的四条点数(仅 BOMB),否则 null */
  bombRank: Rank | null;
}

/**
 * 对局中的一名玩家(公开视图)。
 * 严格对齐后端 @bullfighting/game 的 PublicGamePlayer(projectState 输出)。
 *
 * 注意:对局公开态**不含 nickname / 当前筹码**;牛型在 `hand.type`,盈亏在
 * `resultChips`,座位标识 `seatId` 为字符串(= userId)。昵称由展示层从会话取
 * (仅自己),其他玩家以座位标签展示。
 */
export interface PublicPlayer {
  /** 座位标识 = 用户 id(字符串) */
  seatId: string;
  /** 座位号(0 起) */
  seatNo: number;
  /** 是否庄家 */
  isBanker: boolean;
  /** 抢庄倍数(0=不抢);未决策为 null */
  robMultiplier: number | null;
  /** 闲家下注倍数;未决策为 null(庄家恒 null) */
  betMultiplier: number | null;
  /** 是否已亮牌 */
  revealed: boolean;
  /** 当前阶段是否已完成应做操作 */
  hasActed: boolean;
  /** 手牌:仅本人可见,或亮牌/结算后全部可见;不可见为 null */
  cards: Card[] | null;
  /** 评牌结果:亮牌/结算后可见,否则 null;牛型用 hand.type */
  hand: HandResult | null;
  /** 本局盈亏(结算后);未结算为 null */
  resultChips: number | null;
}

/** 对局公开状态(GET /api/game/[roomId]/sync 与实时 game:state 的 payload) */
export interface PublicGameState {
  roomId: string;
  /** 局号(房间内自增) */
  roundNo: number;
  /** 当前阶段 */
  phase: GamePhase;
  /** 底分 */
  baseScore: number;
  /** 当前阶段截止时间(epoch ms);无限制为 null */
  deadline: number | null;
  /** 庄家座位标识(= userId 字符串);未定庄为 null */
  bankerSeatId: string | null;
  /** 玩家列表(按座位号) */
  players: PublicPlayer[];
}
