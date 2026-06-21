import { and, eq, or } from 'drizzle-orm';
import { friendships, users, type Database } from '@bullfighting/db';
import type {
  FriendsRepository,
  FriendUserRecord,
  Friendship,
  FriendStatus,
} from '@bullfighting/friends';

type FriendshipRow = typeof friendships.$inferSelect;
type UserRow = typeof users.$inferSelect;

/** FriendsRepository 的 Drizzle 实现 */
export class DrizzleFriendsRepository implements FriendsRepository {
  constructor(private readonly db: Database) {}

  async findUserByUsername(username: string): Promise<FriendUserRecord | null> {
    const [row] = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return row ? toFriendUser(row) : null;
  }

  async findUserById(id: string): Promise<FriendUserRecord | null> {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return null;
    const [row] = await this.db.select().from(users).where(eq(users.id, numericId)).limit(1);
    return row ? toFriendUser(row) : null;
  }

  async findFriendshipBetween(a: string, b: string): Promise<Friendship | null> {
    const [na, nb] = [Number(a), Number(b)];
    const [row] = await this.db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, na), eq(friendships.addresseeId, nb)),
          and(eq(friendships.requesterId, nb), eq(friendships.addresseeId, na)),
        ),
      )
      .limit(1);
    return row ? toFriendship(row) : null;
  }

  async createRequest(requesterId: string, addresseeId: string): Promise<Friendship> {
    const [row] = await this.db
      .insert(friendships)
      .values({
        requesterId: Number(requesterId),
        addresseeId: Number(addresseeId),
        status: 'pending',
      })
      .returning();
    return toFriendship(row);
  }

  async findRequestById(id: string): Promise<Friendship | null> {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return null;
    const [row] = await this.db
      .select()
      .from(friendships)
      .where(eq(friendships.id, numericId))
      .limit(1);
    return row ? toFriendship(row) : null;
  }

  async updateStatus(id: string, status: FriendStatus): Promise<Friendship | null> {
    const [row] = await this.db
      .update(friendships)
      .set({ status, updatedAt: new Date() })
      .where(eq(friendships.id, Number(id)))
      .returning();
    return row ? toFriendship(row) : null;
  }

  async deleteFriendship(id: string): Promise<void> {
    await this.db.delete(friendships).where(eq(friendships.id, Number(id)));
  }

  async listAccepted(userId: string): Promise<Friendship[]> {
    const uid = Number(userId);
    const rows = await this.db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.status, 'accepted'),
          or(eq(friendships.requesterId, uid), eq(friendships.addresseeId, uid)),
        ),
      );
    return rows.map(toFriendship);
  }

  async listIncomingPending(userId: string): Promise<Friendship[]> {
    const rows = await this.db
      .select()
      .from(friendships)
      .where(and(eq(friendships.status, 'pending'), eq(friendships.addresseeId, Number(userId))));
    return rows.map(toFriendship);
  }

  async listOutgoingPending(userId: string): Promise<Friendship[]> {
    const rows = await this.db
      .select()
      .from(friendships)
      .where(and(eq(friendships.status, 'pending'), eq(friendships.requesterId, Number(userId))));
    return rows.map(toFriendship);
  }
}

function toFriendship(row: FriendshipRow): Friendship {
  return {
    id: String(row.id),
    requesterId: String(row.requesterId),
    addresseeId: String(row.addresseeId),
    status: row.status as FriendStatus,
  };
}

function toFriendUser(row: UserRow): FriendUserRecord {
  return {
    id: String(row.id),
    username: row.username,
    nickname: row.nickname,
    avatarUrl: row.avatarUrl,
    chips: row.chips,
    status: row.status,
  };
}
