'use client';

import { useEffect } from 'react';
import { gameApi } from './api';
import { useGameStore } from './store';
import type { PublicGameState } from './types';

/**
 * 订阅对局实时频道。
 *
 * - 公共频道 `room:{roomId}` 事件 `game:state` → 整段替换公开状态。
 * - 私有频道 `room:{roomId}:player:{userId}` → 单播含本人手牌的状态。
 *
 * 设计要点:
 * - 动态 import('ably'),避免构建期/SSR 触达;失败则静默降级为轮询。
 * - 通过 /api/realtime/token 的 authCallback 鉴权;若该接口尚未上线(404),
 *   则不建立实时连接,交由轮询兜底。
 */
export function useRealtime(roomId: string | null, userId: string | null): void {
  const setState = useGameStore((s) => s.setState);
  const patchSelf = useGameStore((s) => s.patchSelf);
  const setConnection = useGameStore((s) => s.setConnection);

  useEffect(() => {
    if (!roomId || !userId) return;
    let cancelled = false;
    // 用 unknown + 局部类型,规避对 ably 具体版本类型的硬依赖
    let client: { close: () => void } | null = null;

    async function connect() {
      setConnection('connecting');
      // 先确认 realtime token 接口可用,否则直接降级
      try {
        await gameApi.realtimeToken();
      } catch {
        if (!cancelled) setConnection('offline');
        return;
      }

      try {
        const Ably = await import('ably');
        if (cancelled) return;

        const realtime = new Ably.Realtime({
          // 每次都向后端要新的 TokenRequest(JWT 在 api 客户端里自动带上)
          authCallback: (_params, callback) => {
            gameApi
              .realtimeToken()
              .then((token) => callback(null, token as never))
              .catch((err) => callback(err as never, null));
          },
        });
        client = realtime;

        realtime.connection.on('connected', () => {
          if (!cancelled) setConnection('online');
        });
        realtime.connection.on('failed', () => {
          if (!cancelled) setConnection('offline');
        });

        // 公共频道:公开状态
        const pub = realtime.channels.get(`room:${roomId}`);
        pub.subscribe('game:state', (msg) => {
          if (!cancelled) setState(msg.data as PublicGameState);
        });

        // 私有频道:本人手牌(整段公开状态,但含本人 cards)
        const priv = realtime.channels.get(`room:${roomId}:player:${userId}`);
        priv.subscribe('game:state', (msg) => {
          if (cancelled) return;
          const data = msg.data as PublicGameState;
          // 用整段替换以保证手牌可见;若只想增量也可改用 patchSelf
          setState(data);
        });
        priv.subscribe('cards', (msg) => {
          if (cancelled) return;
          const data = msg.data as {
            userId: string;
            cards: PublicGameState['players'][number]['cards'];
          };
          patchSelf(data);
        });
      } catch {
        if (!cancelled) setConnection('offline');
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
      setConnection('idle');
    };
  }, [roomId, userId, setState, patchSelf, setConnection]);
}
