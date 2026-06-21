import { desc, eq, sql } from 'drizzle-orm';
import {
  rounds,
  roundPlayers,
  userStats,
  users,
  type Database,
  type RoundPlayer,
} from '@bullfighting/db';

/** 用户统计的对外形态(不存在时返回零值) */
export interface UserStatsView {
  userId: string;
  roundsPlayed: number;
  roundsWon: number;
  bankerRounds: number;
  totalWon: number;
  totalLost: number;
  biggestWin: number;
  /** 净赢 = totalWon - totalLost */
  netWin: number;
}

/** 单条战绩:round_players 行 + 关联 round 概要 */
export interface RecordView {
  roundId: string;
  roomId: string;
  roundNo: number;
  endedAt: string | null;
  seatNo: number;
  isBanker: boolean;
  niuType: string | null;
  niuValue: number | null;
  betMultiplier: number;
  robMultiplier: number;
  resultChips: number;
  cards: RoundPlayer['cards'];
}

/** 排行榜指标 */
export type LeaderboardMetric = 'chips' | 'netWin';

/** 排行榜单条 */
export interface LeaderboardEntry {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  /** 该指标的数值(chips 或 净赢) */
  value: number;
}

/** 战绩 / 统计 / 排行榜的只读仓储(读路径用 HTTP 驱动即可,无需事务) */
export class StatsRepository {
  constructor(private readonly db: Database) {}

  /** 取某用户 user_stats;不存在则返回零值视图 */
  async getUserStats(userId: number): Promise<UserStatsView> {
    const [row] = await this.db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);

    if (!row) {
      return {
        userId: String(userId),
        roundsPlayed: 0,
        roundsWon: 0,
        bankerRounds: 0,
        totalWon: 0,
        totalLost: 0,
        biggestWin: 0,
        netWin: 0,
      };
    }

    return {
      userId: String(row.userId),
      roundsPlayed: row.roundsPlayed,
      roundsWon: row.roundsWon,
      bankerRounds: row.bankerRounds,
      totalWon: row.totalWon,
      totalLost: row.totalLost,
      biggestWin: row.biggestWin,
      netWin: row.totalWon - row.totalLost,
    };
  }

  /** 取某用户最近的战绩(round_players JOIN rounds),按局结束时间倒序 */
  async listRecords(userId: number, limit: number, offset: number): Promise<RecordView[]> {
    const rowsResult = await this.db
      .select({
        roundId: roundPlayers.roundId,
        roomId: rounds.roomId,
        roundNo: rounds.roundNo,
        endedAt: rounds.endedAt,
        seatNo: roundPlayers.seatNo,
        isBanker: roundPlayers.isBanker,
        niuType: roundPlayers.niuType,
        niuValue: roundPlayers.niuValue,
        betMultiplier: roundPlayers.betMultiplier,
        robMultiplier: roundPlayers.robMultiplier,
        resultChips: roundPlayers.resultChips,
        cards: roundPlayers.cards,
      })
      .from(roundPlayers)
      .innerJoin(rounds, eq(roundPlayers.roundId, rounds.id))
      .where(eq(roundPlayers.userId, userId))
      .orderBy(desc(roundPlayers.roundId))
      .limit(limit)
      .offset(offset);

    return rowsResult.map((r) => ({
      roundId: String(r.roundId),
      roomId: String(r.roomId),
      roundNo: r.roundNo,
      endedAt: r.endedAt ? r.endedAt.toISOString() : null,
      seatNo: r.seatNo,
      isBanker: r.isBanker,
      niuType: r.niuType,
      niuValue: r.niuValue,
      betMultiplier: r.betMultiplier,
      robMultiplier: r.robMultiplier,
      resultChips: r.resultChips,
      cards: r.cards,
    }));
  }

  /** 排行榜:按 users.chips 或累计净赢(user_stats.totalWon - totalLost)倒序 */
  async leaderboard(metric: LeaderboardMetric, limit: number): Promise<LeaderboardEntry[]> {
    if (metric === 'chips') {
      const rowsResult = await this.db
        .select({
          userId: users.id,
          nickname: users.nickname,
          avatarUrl: users.avatarUrl,
          value: users.chips,
        })
        .from(users)
        .orderBy(desc(users.chips))
        .limit(limit);
      return rowsResult.map((r) => ({
        userId: String(r.userId),
        nickname: r.nickname,
        avatarUrl: r.avatarUrl,
        value: r.value,
      }));
    }

    // netWin:净赢 = totalWon - totalLost,关联用户基本信息
    const net = sql<number>`${userStats.totalWon} - ${userStats.totalLost}`;
    const rowsResult = await this.db
      .select({
        userId: users.id,
        nickname: users.nickname,
        avatarUrl: users.avatarUrl,
        value: net,
      })
      .from(userStats)
      .innerJoin(users, eq(userStats.userId, users.id))
      .orderBy(desc(net))
      .limit(limit);
    return rowsResult.map((r) => ({
      userId: String(r.userId),
      nickname: r.nickname,
      avatarUrl: r.avatarUrl,
      value: Number(r.value),
    }));
  }
}

let cached: StatsRepository | undefined;

/** 惰性构造只读统计仓储 */
export function getStatsRepository(db: Database): StatsRepository {
  if (!cached) {
    cached = new StatsRepository(db);
  }
  return cached;
}
