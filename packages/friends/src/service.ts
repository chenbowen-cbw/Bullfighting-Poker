import { normalizePair, type FriendsRepository } from './repository';
import type { Friendship, FriendRequest, PublicFriend } from './types';
import { FriendsError } from './errors';

/** Postgres 唯一约束冲突错误码 */
const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === PG_UNIQUE_VIOLATION
  );
}

/** 取关系中的「收件人」id:规范化对里非发起方的那一方 */
function recipientOf(f: Friendship): string {
  return f.initiatorId === f.requesterId ? f.addresseeId : f.requesterId;
}

/**
 * 好友服务:好友请求 / 接受 / 拒绝 / 列表 / 删除。依赖注入 FriendsRepository。
 *
 * 配对规范化:每对好友以「无序对(low<high)」存一行,谁先发起记在 initiatorId,
 * 收件人=另一方。如此 A→B 与 B→A 命中同一行,杜绝并发双插的重复关系。
 *
 * 所有写操作都基于"已通过 JWT 鉴权的 userId"做授权,绝不信任请求体里的归属 id。
 */
export class FriendsService {
  constructor(private readonly repo: FriendsRepository) {}

  /**
   * 发起好友请求(按用户名)。
   * - 用户名解析失败 → USER_NOT_FOUND;
   * - 加自己 → CANNOT_FRIEND_SELF;
   * - 已是好友 → ALREADY_FRIENDS;
   * - 我已发起(同向 pending,initiator===我)→ REQUEST_EXISTS;
   * - 对方已发起(反向 pending,initiator!==我)→ 自动接受并返回 accepted 关系;
   * - 否则创建规范化 pending 请求(initiator=我)。
   */
  async sendRequest(fromUserId: string, toUsername: string): Promise<Friendship> {
    const target = await this.repo.findUserByUsername(toUsername);
    if (!target) throw FriendsError.userNotFound();
    if (target.id === fromUserId) throw FriendsError.cannotFriendSelf();

    const { low, high } = normalizePair(fromUserId, target.id);
    const existing = await this.repo.findFriendshipBetween(low, high);
    if (existing) {
      if (existing.status === 'accepted') throw FriendsError.alreadyFriends();
      // pending:发起方是我 → 同向重复;发起方是对方 → 自动接受(对方早已请求我)
      if (existing.initiatorId === fromUserId) throw FriendsError.requestExists();
      const accepted = await this.repo.updateStatus(existing.id, 'accepted');
      return accepted ?? { ...existing, status: 'accepted' };
    }

    try {
      return await this.repo.createRequest(low, high, fromUserId, 'pending');
    } catch (err) {
      // 并发下唯一约束兜底:竞态插入冲突 → 重读并解析,而非 500
      if (isUniqueViolation(err)) {
        const raced = await this.repo.findFriendshipBetween(low, high);
        if (raced) {
          if (raced.status === 'accepted') throw FriendsError.alreadyFriends();
          // 反向并发已抢先建好 pending:此刻接受即可成为好友
          if (raced.initiatorId !== fromUserId) {
            const accepted = await this.repo.updateStatus(raced.id, 'accepted');
            return accepted ?? { ...raced, status: 'accepted' };
          }
        }
        throw FriendsError.requestExists();
      }
      throw err;
    }
  }

  /** 接受请求:必须是待处理且收件人(非发起方)为本人,否则拒绝。 */
  async acceptRequest(userId: string, requestId: string): Promise<Friendship> {
    const request = await this.repo.findRequestById(requestId);
    if (!request || request.status !== 'pending') throw FriendsError.requestNotFound();
    if (recipientOf(request) !== userId) throw FriendsError.forbidden();
    const accepted = await this.repo.updateStatus(requestId, 'accepted');
    if (!accepted) throw FriendsError.requestNotFound();
    return accepted;
  }

  /** 拒绝请求:授权同 accept(仅收件人);直接删除该 pending 请求。 */
  async rejectRequest(userId: string, requestId: string): Promise<void> {
    const request = await this.repo.findRequestById(requestId);
    if (!request || request.status !== 'pending') throw FriendsError.requestNotFound();
    if (recipientOf(request) !== userId) throw FriendsError.forbidden();
    await this.repo.deleteFriendship(requestId);
  }

  /** 删除好友:必须存在包含双方的 accepted 关系,否则 NOT_FRIENDS。 */
  async removeFriend(userId: string, friendId: string): Promise<void> {
    const { low, high } = normalizePair(userId, friendId);
    const friendship = await this.repo.findFriendshipBetween(low, high);
    if (!friendship || friendship.status !== 'accepted') throw FriendsError.notFriends();
    await this.repo.deleteFriendship(friendship.id);
  }

  /** 是否为好友(accepted)。两人之间无 accepted 关系返回 false。 */
  async areFriends(userId: string, otherId: string): Promise<boolean> {
    const friendship = await this.repo.findFriendshipBetween(userId, otherId);
    return Boolean(friendship && friendship.status === 'accepted');
  }

  /** 断言两人为好友,否则抛 NOT_FRIENDS(用于邀请等需要好友前置的操作)。 */
  async requireFriends(userId: string, otherId: string): Promise<void> {
    if (!(await this.areFriends(userId, otherId))) throw FriendsError.notFriends();
  }

  /** 好友列表:accepted 关系 → 对方的公开资料(规范化后天然去重)。 */
  async listFriends(userId: string): Promise<PublicFriend[]> {
    const accepted = await this.repo.listAccepted(userId);
    const friends: PublicFriend[] = [];
    for (const f of accepted) {
      const otherId = f.requesterId === userId ? f.addresseeId : f.requesterId;
      const user = await this.repo.findUserById(otherId);
      if (user) friends.push(user);
    }
    return friends;
  }

  /** 待处理请求:incoming(别人发起、待我处理)与 outgoing(我发起、待对方处理)。 */
  async listRequests(
    userId: string,
  ): Promise<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }> {
    const pending = await this.repo.listPending(userId);
    const incomingRows = pending.filter((f) => f.initiatorId !== userId);
    const outgoingRows = pending.filter((f) => f.initiatorId === userId);

    // 对方 = 规范化对里非本人的一方
    const otherOf = (f: Friendship): string =>
      f.requesterId === userId ? f.addresseeId : f.requesterId;

    const incoming = await this.toRequests(incomingRows, 'incoming', otherOf);
    const outgoing = await this.toRequests(outgoingRows, 'outgoing', otherOf);
    return { incoming, outgoing };
  }

  private async toRequests(
    rows: Friendship[],
    direction: 'incoming' | 'outgoing',
    otherIdOf: (f: Friendship) => string,
  ): Promise<FriendRequest[]> {
    const result: FriendRequest[] = [];
    for (const f of rows) {
      const user = await this.repo.findUserById(otherIdOf(f));
      if (user) result.push({ id: f.id, direction, user });
    }
    return result;
  }
}
