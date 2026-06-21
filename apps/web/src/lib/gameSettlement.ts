import { eq, sql } from 'drizzle-orm';
import {
  createPooledDb,
  rounds,
  roundPlayers,
  transactions,
  userStats,
  users,
  type PooledTransaction,
} from '@bullfighting/db';
import {
  computeRoundPersistence,
  type RoundSettlementContext,
  type UserStatsDelta,
} from '@bullfighting/stats';
import type { GameSettlementSink } from './gamePorts';

/** 把 SeatId(string | number)统一成 users.id 用的数字 */
function toUserId(seatId: string | number): number {
  return typeof seatId === 'number' ? seatId : Number(seatId);
}

/**
 * 结算落库的 Drizzle 实现:在**单个事务**内原子完成
 * - 各 users.chips 增减(以 SQL 原子自增,避免读改写竞态);
 * - transactions 写账本(type='round_settle',记录 balanceAfter);
 * - rounds 写一行;
 * - round_players 批量写入(含 cards/niuType/niuValue/isBanker/倍数/resultChips);
 * - user_stats 累加(UPSERT:roundsPlayed/roundsWon/bankerRounds/totalWon/totalLost,
 *   biggestWin 取 GREATEST)。
 *
 * 使用 Neon 的 WebSocket Pool 驱动(neon-serverless);每次结算新建连接池,
 * 结算结束后在 finally 中关闭,避免 Serverless 环境连接泄漏。
 */
export class DrizzleGameSettlement implements GameSettlementSink {
  constructor(private readonly connectionString: string) {}

  async apply(ctx: RoundSettlementContext): Promise<{ roundId: string }> {
    const { round, roundPlayers: playerRows, statsDeltas } = computeRoundPersistence(ctx);
    const { pool, db } = createPooledDb(this.connectionString);

    try {
      const roundId = await db.transaction(async (tx) => {
        // 1) 写 rounds,拿回自增 id
        const [roundRow] = await tx
          .insert(rounds)
          .values({
            roomId: toUserId(round.roomId),
            roundNo: round.roundNo,
            bankerUserId: round.bankerUserId === null ? null : toUserId(round.bankerUserId),
            shuffleSeed: round.shuffleSeed,
            shuffleProof: round.shuffleProof,
            phase: round.phase,
            startedAt: new Date(),
            endedAt: new Date(),
          })
          .returning({ id: rounds.id });
        const newRoundId = roundRow.id;

        // 2) 写 round_players(批量)
        if (playerRows.length > 0) {
          await tx.insert(roundPlayers).values(
            playerRows.map((p) => ({
              roundId: newRoundId,
              userId: toUserId(p.userId),
              seatNo: p.seatNo,
              cards: p.cards,
              niuType: p.niuType,
              niuValue: p.niuValue,
              isBanker: p.isBanker,
              betMultiplier: p.betMultiplier,
              robMultiplier: p.robMultiplier,
              resultChips: p.resultChips,
            })),
          );
        }

        // 3) 逐玩家:原子更新 chips → 读回新余额 → 写账本
        for (const p of playerRows) {
          const userId = toUserId(p.userId);
          const [updated] = await tx
            .update(users)
            .set({ chips: sql`${users.chips} + ${p.resultChips}`, updatedAt: new Date() })
            .where(eq(users.id, userId))
            .returning({ chips: users.chips });
          // 玩家理应存在;防御性地兜底余额
          const balanceAfter = updated?.chips ?? 0;

          await tx.insert(transactions).values({
            userId,
            roundId: newRoundId,
            type: 'round_settle',
            amount: p.resultChips,
            balanceAfter,
          });
        }

        // 4) 累加 user_stats(UPSERT)
        for (const delta of statsDeltas) {
          await upsertUserStats(tx, delta);
        }

        return newRoundId;
      });

      return { roundId: String(roundId) };
    } finally {
      // Serverless 关键点:释放连接池,避免 WebSocket 连接泄漏。
      await pool.end();
    }
  }
}

/** UPSERT 单个用户的统计增量;biggestWin 取历史与本局净赢的较大者 */
async function upsertUserStats(tx: PooledTransaction, delta: UserStatsDelta): Promise<void> {
  const userId = toUserId(delta.userId);
  const biggestWinCandidate = delta.roundNet > 0 ? delta.roundNet : 0;

  await tx
    .insert(userStats)
    .values({
      userId,
      roundsPlayed: delta.roundsPlayed,
      roundsWon: delta.roundsWon,
      bankerRounds: delta.bankerRounds,
      totalWon: delta.totalWon,
      totalLost: delta.totalLost,
      biggestWin: biggestWinCandidate,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userStats.userId,
      set: {
        roundsPlayed: sql`${userStats.roundsPlayed} + ${delta.roundsPlayed}`,
        roundsWon: sql`${userStats.roundsWon} + ${delta.roundsWon}`,
        bankerRounds: sql`${userStats.bankerRounds} + ${delta.bankerRounds}`,
        totalWon: sql`${userStats.totalWon} + ${delta.totalWon}`,
        totalLost: sql`${userStats.totalLost} + ${delta.totalLost}`,
        biggestWin: sql`GREATEST(${userStats.biggestWin}, ${biggestWinCandidate})`,
        updatedAt: new Date(),
      },
    });
}
