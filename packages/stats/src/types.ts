/**
 * 结算落库相关的纯类型。
 *
 * 这些类型刻意与具体的对局状态机(@bullfighting/game)解耦:任何能产出一份
 * “结算上下文”的调用方都可复用本包推导落库载荷。Web 适配层会从结算后的
 * GameState 构造 {@link RoundSettlementContext}。
 */

/** 座位标识(用户 id),与 @bullfighting/core 的 SeatId 对齐 */
export type SeatId = string | number;

/** 单个玩家在本局的结算上下文 */
export interface SettlementPlayer {
  /** 用户 id */
  userId: SeatId;
  /** 座位号 */
  seatNo: number;
  /** 手牌(原样落入 round_players.cards 的 jsonb) */
  cards: unknown;
  /** 牛型字符串(如 'NIU_NIU'),无则 null */
  niuType: string | null;
  /** 牛值(牛牛=0,牛1..9=1..9,特殊牌型=-1),无则 null */
  niuValue: number | null;
  /** 是否为庄家 */
  isBanker: boolean;
  /** 闲家下注倍数(≥ 1) */
  betMultiplier: number;
  /** 抢庄倍数(≥ 1) */
  robMultiplier: number;
  /** 本局结算筹码增减(正=赢,负=输,零和总和应为 0) */
  resultChips: number;
}

/** 一局结算的完整上下文,作为落库的唯一输入 */
export interface RoundSettlementContext {
  /** 房间 id */
  roomId: SeatId;
  /** 局号(房间内自增) */
  roundNo: number;
  /** 庄家座位/用户 id;无庄家则 null */
  bankerSeatId: SeatId | null;
  /** 底分 */
  baseScore: number;
  /** 洗牌种子(可选,落入 rounds.shuffleSeed) */
  shuffleSeed?: string | null;
  /** 洗牌证明(可选,落入 rounds.shuffleProof) */
  shuffleProof?: string | null;
  /** 全部参与玩家(含庄家) */
  players: SettlementPlayer[];
}

/** rounds 表写入载荷(roomId/roundNo 由上下文直接给出) */
export interface RoundRow {
  roomId: SeatId;
  roundNo: number;
  bankerUserId: SeatId | null;
  shuffleSeed: string | null;
  shuffleProof: string | null;
  phase: string;
}

/** round_players 表写入载荷(roundId 在落库时回填) */
export interface RoundPlayerRow {
  userId: SeatId;
  seatNo: number;
  cards: unknown;
  niuType: string | null;
  niuValue: number | null;
  isBanker: boolean;
  betMultiplier: number;
  robMultiplier: number;
  resultChips: number;
}

/** 单个用户的 user_stats 增量(用于 UPSERT 累加) */
export interface UserStatsDelta {
  userId: SeatId;
  /** 本次新增对局数(恒为 1) */
  roundsPlayed: number;
  /** 本次新增胜局数(resultChips > 0 计 1) */
  roundsWon: number;
  /** 本次新增坐庄局数(isBanker 计 1) */
  bankerRounds: number;
  /** 本次累计赢取(resultChips > 0 时取其值,否则 0) */
  totalWon: number;
  /** 本次累计输掉(resultChips < 0 时取其绝对值,否则 0) */
  totalLost: number;
  /** 本局净赢(用于刷新 biggestWin 的候选值,可能为负) */
  roundNet: number;
}

/** 一局结算推导出的全部写入载荷 */
export interface RoundPersistence {
  round: RoundRow;
  roundPlayers: RoundPlayerRow[];
  statsDeltas: UserStatsDelta[];
}
