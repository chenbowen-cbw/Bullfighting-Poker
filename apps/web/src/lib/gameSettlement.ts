import { eq, sql } from 'drizzle-orm';
import { transactions, users, type Database } from '@bullfighting/db';
import type { SettlementDelta } from '@bullfighting/game';
import type { GameSettlementSink } from './gamePorts';

/**
 * GameSettlementSink 的 Drizzle 实现:把结算盈亏写入用户筹码与账本。
 *
 * 注:Neon HTTP 驱动不支持交互式事务,这里逐条原子自增并记账;
 * 完整的「一局多表事务 + round_players 落库」将在 M5(战绩/记录)用
 * neon-serverless Pool 包裹事务实现。
 */
export class DrizzleGameSettlement implements GameSettlementSink {
  constructor(private readonly db: Database) {}

  async apply(_roomId: string, _roundNo: number, deltas: SettlementDelta[]): Promise<void> {
    for (const d of deltas) {
      if (d.delta === 0) continue;
      const userId = Number(d.seatId);
      const [updated] = await this.db
        .update(users)
        .set({ chips: sql`${users.chips} + ${d.delta}` })
        .where(eq(users.id, userId))
        .returning({ chips: users.chips });
      if (updated) {
        await this.db.insert(transactions).values({
          userId,
          type: 'round_settle',
          amount: d.delta,
          balanceAfter: updated.chips,
        });
      }
    }
  }
}
