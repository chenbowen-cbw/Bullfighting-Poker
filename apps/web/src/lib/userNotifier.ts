import { Rest } from 'ably';
import type { PublicUser } from '@bullfighting/auth';

/**
 * 面向"用户个人频道"的实时通知器。
 *
 * 频道命名 `user:{userId}`,事件:
 * - `friend:request` 收到新的好友请求
 * - `friend:accept`  我发出的请求被接受
 * - `friend:invite`  好友邀请我进入某房间
 *
 * 与 game.ts / gamePublisher.ts 一致地从 ABLY_API_KEY 构造 Ably Rest。
 * 所有发布失败均吞掉(console.warn),实时抖动绝不影响 HTTP 主流程。
 */
class UserNotifier {
  private rest: Rest | null = null;

  private getRest(): Rest | null {
    if (this.rest) return this.rest;
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      console.warn('ABLY_API_KEY 未配置,跳过实时通知');
      return null;
    }
    this.rest = new Rest(apiKey);
    return this.rest;
  }

  private async publish(userId: string, event: string, data: unknown): Promise<void> {
    const rest = this.getRest();
    if (!rest) return;
    try {
      await rest.channels.get(`user:${userId}`).publish(event, data);
    } catch (err) {
      console.warn(`实时通知发布失败(${event} → user:${userId}):`, err);
    }
  }

  /** 通知 toUserId:fromUser 向其发起了好友请求 */
  async notifyFriendRequest(toUserId: string, fromUser: PublicUser): Promise<void> {
    await this.publish(toUserId, 'friend:request', {
      from: { id: fromUser.id, username: fromUser.username, nickname: fromUser.nickname },
    });
  }

  /** 通知 toUserId:fromUser 接受了其好友请求 */
  async notifyFriendAccepted(toUserId: string, fromUser: PublicUser): Promise<void> {
    await this.publish(toUserId, 'friend:accept', {
      from: { id: fromUser.id, username: fromUser.username, nickname: fromUser.nickname },
    });
  }

  /** 通知 toUserId:被邀请进入某房间 */
  async notifyGameInvite(
    toUserId: string,
    payload: { roomId: string; roomCode: string; fromUser: { id: string; nickname: string } },
  ): Promise<void> {
    await this.publish(toUserId, 'friend:invite', payload);
  }
}

/** 进程内单例 */
export const userNotifier = new UserNotifier();
