import type { Friendship, FriendStatus, PublicFriend } from './types';

/**
 * 仓储层返回的用户记录(仅公开安全字段)。
 * Drizzle 实现从 users 表投影,内存实现用于单测。
 */
export type FriendUserRecord = PublicFriend;

/** 好友存储抽象。Drizzle 实现与内存实现(测试)各自满足此接口。 */
export interface FriendsRepository {
  findUserByUsername(username: string): Promise<FriendUserRecord | null>;
  findUserById(id: string): Promise<FriendUserRecord | null>;
  /** 查两人之间的任意一条好友关系(任一方向),不存在返回 null */
  findFriendshipBetween(a: string, b: string): Promise<Friendship | null>;
  createRequest(requesterId: string, addresseeId: string): Promise<Friendship>;
  findRequestById(id: string): Promise<Friendship | null>;
  updateStatus(id: string, status: FriendStatus): Promise<Friendship | null>;
  deleteFriendship(id: string): Promise<void>;
  /** 已成为好友(accepted)且包含该用户的全部关系 */
  listAccepted(userId: string): Promise<Friendship[]>;
  /** 别人请求我、待我处理的(addressee=userId 且 pending) */
  listIncomingPending(userId: string): Promise<Friendship[]>;
  /** 我请求别人、待对方处理的(requester=userId 且 pending) */
  listOutgoingPending(userId: string): Promise<Friendship[]>;
}

/** 内存实现,供单元测试使用(无需数据库) */
export class InMemoryFriendsRepository implements FriendsRepository {
  private readonly users = new Map<string, FriendUserRecord>();
  private readonly friendships = new Map<string, Friendship>();
  private seq = 0;

  /** 测试辅助:预置用户 */
  seedUser(user: FriendUserRecord): FriendUserRecord {
    this.users.set(user.id, { ...user });
    return user;
  }

  async findUserByUsername(username: string): Promise<FriendUserRecord | null> {
    for (const u of this.users.values()) {
      if (u.username === username) return { ...u };
    }
    return null;
  }

  async findUserById(id: string): Promise<FriendUserRecord | null> {
    const u = this.users.get(id);
    return u ? { ...u } : null;
  }

  async findFriendshipBetween(a: string, b: string): Promise<Friendship | null> {
    for (const f of this.friendships.values()) {
      const pair =
        (f.requesterId === a && f.addresseeId === b) ||
        (f.requesterId === b && f.addresseeId === a);
      if (pair) return { ...f };
    }
    return null;
  }

  async createRequest(requesterId: string, addresseeId: string): Promise<Friendship> {
    // 模拟 UNIQUE(requester, addressee):同方向已存在则抛错(仿唯一约束冲突)
    for (const f of this.friendships.values()) {
      if (f.requesterId === requesterId && f.addresseeId === addresseeId) {
        const err = new Error('duplicate friendship pair') as Error & { code?: string };
        err.code = '23505';
        throw err;
      }
    }
    this.seq += 1;
    const friendship: Friendship = {
      id: String(this.seq),
      requesterId,
      addresseeId,
      status: 'pending',
    };
    this.friendships.set(friendship.id, friendship);
    return { ...friendship };
  }

  async findRequestById(id: string): Promise<Friendship | null> {
    const f = this.friendships.get(id);
    return f ? { ...f } : null;
  }

  async updateStatus(id: string, status: FriendStatus): Promise<Friendship | null> {
    const f = this.friendships.get(id);
    if (!f) return null;
    f.status = status;
    return { ...f };
  }

  async deleteFriendship(id: string): Promise<void> {
    this.friendships.delete(id);
  }

  async listAccepted(userId: string): Promise<Friendship[]> {
    return [...this.friendships.values()]
      .filter(
        (f) => f.status === 'accepted' && (f.requesterId === userId || f.addresseeId === userId),
      )
      .map((f) => ({ ...f }));
  }

  async listIncomingPending(userId: string): Promise<Friendship[]> {
    return [...this.friendships.values()]
      .filter((f) => f.status === 'pending' && f.addresseeId === userId)
      .map((f) => ({ ...f }));
  }

  async listOutgoingPending(userId: string): Promise<Friendship[]> {
    return [...this.friendships.values()]
      .filter((f) => f.status === 'pending' && f.requesterId === userId)
      .map((f) => ({ ...f }));
  }
}
