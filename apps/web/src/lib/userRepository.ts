import { eq } from 'drizzle-orm';
import { users, type User, type Database } from '@bullfighting/db';
import type { AuthUserRecord, CreateUserInput, UserRepository } from '@bullfighting/auth';

/** UserRepository 的 Drizzle 实现 */
export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  async findByUsername(username: string): Promise<AuthUserRecord | null> {
    const rows = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async findById(id: string): Promise<AuthUserRecord | null> {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return null;
    const rows = await this.db.select().from(users).where(eq(users.id, numericId)).limit(1);
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async create(input: CreateUserInput): Promise<AuthUserRecord> {
    const rows = await this.db
      .insert(users)
      .values({
        username: input.username,
        passwordHash: input.passwordHash,
        nickname: input.nickname,
        chips: input.chips,
      })
      .returning();
    return toRecord(rows[0]);
  }
}

function toRecord(row: User): AuthUserRecord {
  return {
    id: String(row.id),
    username: row.username,
    passwordHash: row.passwordHash,
    nickname: row.nickname,
    chips: row.chips,
    status: row.status,
  };
}
