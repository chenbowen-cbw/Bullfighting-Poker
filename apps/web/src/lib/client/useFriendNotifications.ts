'use client';

import { useEffect, useRef, useState } from 'react';
import { gameApi } from './api';

/** 好友请求通知:对方发起了请求 */
export interface FriendRequestNotice {
  type: 'friend:request';
  from: { id: string; username: string; nickname: string };
}

/** 好友接受通知:我发出的请求被接受 */
export interface FriendAcceptNotice {
  type: 'friend:accept';
  from: { id: string; username: string; nickname: string };
}

/** 游戏邀请通知:好友邀我进房 */
export interface GameInviteNotice {
  type: 'friend:invite';
  roomId: string;
  roomCode: string;
  fromUser: { id: string; nickname: string };
}

/** 快速匹配通知:已凑齐,被分到某房间(供前端自动进入) */
export interface MatchFoundNotice {
  type: 'match:found';
  roomId: string;
  roomCode: string;
}

export type FriendNotice =
  | FriendRequestNotice
  | FriendAcceptNotice
  | GameInviteNotice
  | MatchFoundNotice;

/** 单调自增序号 + 通知,便于 UI 用 useEffect 去重消费 */
export interface FriendNoticeEvent {
  seq: number;
  notice: FriendNotice;
}

/**
 * 订阅个人实时频道 `user:{userId}`,接收好友相关通知。
 *
 * 设计要点(对齐 useRealtime):
 * - 动态 import('ably'),避免构建期/SSR 触达;失败则静默降级(无实时,不报错)。
 * - 通过 /api/realtime/token 的 authCallback 鉴权;接口不可用则不建立连接。
 * - 不维护连接状态 UI;仅把"最近一条通知"以自增序号暴露给上层消费。
 */
export function useFriendNotifications(userId: string | null): FriendNoticeEvent | null {
  const [event, setEvent] = useState<FriendNoticeEvent | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let client: { close: () => void } | null = null;

    function emit(notice: FriendNotice) {
      if (cancelled) return;
      seqRef.current += 1;
      setEvent({ seq: seqRef.current, notice });
    }

    async function connect() {
      // 先确认 realtime token 接口可用,否则直接降级
      try {
        await gameApi.realtimeToken();
      } catch {
        return;
      }

      try {
        const Ably = await import('ably');
        if (cancelled) return;

        const realtime = new Ably.Realtime({
          authCallback: (_params, callback) => {
            gameApi
              .realtimeToken()
              .then((token) => callback(null, token as never))
              .catch((err) => callback(err as never, null));
          },
        });
        client = realtime;

        const channel = realtime.channels.get(`user:${userId}`);
        channel.subscribe('friend:request', (msg) => {
          const data = msg.data as { from: FriendRequestNotice['from'] };
          emit({ type: 'friend:request', from: data.from });
        });
        channel.subscribe('friend:accept', (msg) => {
          const data = msg.data as { from: FriendAcceptNotice['from'] };
          emit({ type: 'friend:accept', from: data.from });
        });
        channel.subscribe('friend:invite', (msg) => {
          const data = msg.data as Omit<GameInviteNotice, 'type'>;
          emit({ type: 'friend:invite', ...data });
        });
        channel.subscribe('match:found', (msg) => {
          const data = msg.data as Omit<MatchFoundNotice, 'type'>;
          emit({ type: 'match:found', ...data });
        });
      } catch {
        // 实时不可用:静默降级
      }
    }

    void connect();

    return () => {
      cancelled = true;
      try {
        client?.close();
      } catch {
        // 忽略关闭异常
      }
    };
  }, [userId]);

  return event;
}
