'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/client/store';

/**
 * 进入某游戏:已登录直达入口路由;未登录跳登录页并带 redirect 回跳。
 * 在点击时读取最新 token(getState),避免闭包过期。
 */
export function useEnterGame() {
  const router = useRouter();
  return useCallback(
    (entry: string) => {
      const token = useAuthStore.getState().token;
      if (token) router.push(entry);
      else router.push(`/login?redirect=${encodeURIComponent(entry)}`);
    },
    [router],
  );
}
