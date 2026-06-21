import type { Friendship, FriendStatus, PublicFriend } from './types';

/**
 * 仓储层返回的用户记录(仅公开安全字段)。
 * Drizzle 实现从 users 表投影,内存实现用于单测。
 */
export type FriendUserRecord = PublicFriend;

/**
 * 把两个 id 规范化为「小在前」的无序对。
 * 用于让 A↔B 与 B↔A 映射到同一条 friendships 记录(requesterId < addresseeId)。
 */
export function normalizePair(a: string, b: string): { low: string; high: string } {
  // 以数值比较(id 为正整数字符串),保持与 DB CHECK(requester_id < addressee_id)一致
  return Number(a) <= Number(b) ? { low: a, high: b } : { low: b, high: a };
}

/** 好友存储抽象。Drizzle 实现与内存实现(测试)各自满足此接口。 */
export interface FriendsRepository {
  findUserByUsername(username: string): Promise<FriendUserRecord | null>;
  findUserById(id: string): Promise<FriendUserRecord | null>;
  /** 查两人之间的唯一好友关系(内部按无序对规范化),不存在返回 null */
  findFriendshipBetween(a: string, b: string): Promise<Friendship | null>;
  /**
   * 写入一条好友关系。
   * @param requesterId 规范化对的小 id(low)
   * @param addresseeId 规范化对的大 id(high),须 requesterId < addresseeId
   * @param initiatorId 实际发起方(必为 requesterId/addresseeId 之一)
   * @param status 初始状态
   */
  createRequest(
    requesterId: string,
    addresseeId: string,
    initiatorId: string,
    status: FriendStatus,
  ): Promise<Friendship>;
  findRequestById(id: string): Promise<Friendship | null>;
  updateStatus(id: string, status: FriendStatus): Promise<Friendship | null>;
  deleteFriendship(id: string): Promise<void>;
  /** 已成为好友(accepted)且包含该用户的全部关系 */
  listAccepted(userId: string): Promise<Friendship[]>;
  /** 待处理(pending)且包含该用户的全部关系(收/发由 service 按 initiatorId 区分) */
  listPending(userId: string): Promise<Friendship[]>;
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
    if (!Number.isFinite(Number(id))) return null;
    const u = this.users.get(id);
    return u ? { ...u } : null;
  }

  async findFriendshipBetween(a: string, b: string): Promise<Friendship | null> {
    if (!Number.isFinite(Number(a)) || !Number.isFinite(Number(b))) return null;
    const { low, high } = normalizePair(a, b);
    for (const f of this.friendships.values()) {
      if (f.requesterId === low && f.addresseeId === high) return { ...f };
    }
    return null;
  }

  async createRequest(
    requesterId: string,
    addresseeId: string,
    initiatorId: string,
    status: FriendStatus,
  ): Promise<Friendship> {
    // 模拟 UNIQUE(requester, addressee):规范化对已存在则抛错(仿唯一约束冲突)
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
      initiatorId,
      status,
    };
    this.friendships.set(friendship.id, friendship);
    return { ...friendship };
  }

  async findRequestById(id: string): Promise<Friendship | null> {
    if (!Number.isFinite(Number(id))) return null;
    const f = this.friendships.get(id);
    return f ? { ...f } : null;
  }

  async updateStatus(id: string, status: FriendStatus): Promise<Friendship | null> {
    if (!Number.isFinite(Number(id))) return null;
    const f = this.friendships.get(id);
    if (!f) return null;
    f.status = status;
    return { ...f };
  }

  async deleteFriendship(id: string): Promise<void> {
    if (!Number.isFinite(Number(id))) return;
    this.friendships.delete(id);
  }

  async listAccepted(userId: string): Promise<Friendship[]> {
    if (!Number.isFinite(Number(userId))) return [];
    return [...this.friendships.values()]
      .filter(
        (f) => f.status === 'accepted' && (f.requesterId === userId || f.addresseeId === userId),
      )
      .map((f) => ({ ...f }));
  }

  async listPending(userId: string): Promise<Friendship[]> {
    if (!Number.isFinite(Number(userId))) return [];
    return [...this.friendships.values()]
      .filter(
        (f) => f.status === 'pending' && (f.requesterId === userId || f.addresseeId === userId),
      )
      .map((f) => ({ ...f }));
  }
}
