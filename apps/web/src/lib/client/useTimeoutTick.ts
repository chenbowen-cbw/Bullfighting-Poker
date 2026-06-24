'use client';

import { useEffect } from 'react';
import { gameApi } from './api';
import type { PublicGameState } from './types';

/**
 * 客户端超时兜底:当本阶段 deadline 过去后,催服务端推进一次。
 *
 * 用于防止 QStash 定时未触发(令牌/配置问题等)导致对局卡在某阶段。
 * - 留 2s 余量,确保服务端时钟也已越过 deadline(规避客户端/服务端时钟偏移);
 * - 服务端 tick 仅在确已到期时推进,且对所有参与者幂等(谁先到谁推进,其余拿到新态后定时自然重置);
 * - deadline 变化(阶段切换)时定时自动重置;deadline 为 null(等待态)则不催。
 */
export function useTimeoutTick(
  roomId: string | null,
  deadline: number | null,
  onTicked: (state: PublicGameState) => void,
): void {
  useEffect(() => {
    if (!roomId || deadline === null) return;
    const GRACE_MS = 2000;
    const delay = Math.max(0, deadline - Date.now()) + GRACE_MS;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const next = await gameApi.tick(roomId);
        if (!cancelled) onTicked(next);
      } catch {
        // 兜底失败:静默(实时推送或下一次状态更新会重置定时)
      }
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [roomId, deadline, onTicked]);
}
