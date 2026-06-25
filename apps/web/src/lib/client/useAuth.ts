'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { authApi, clearToken, getToken } from './api';
import { useAuthStore } from './store';

/**
 * 在客户端恢复登录态:若本地有 token 则拉 /me 校验,失败则清除。
 * 只需在根布局挂一次。
 */
export function useAuthBootstrap(): void {
  const setUser = useAuthStore((s) => s.setUser);
  const signOut = useAuthStore((s) => s.signOut);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setHydrated();
      return;
    }
    let cancelled = false;
    authApi
      .me()
      .then(({ user }) => {
        if (!cancelled) setUser(user);
      })
      .catch(() => {
        if (!cancelled) {
          clearToken();
          signOut();
        }
      })
      .finally(() => {
        if (!cancelled) setHydrated();
      });
    return () => {
      cancelled = true;
    };
  }, [setUser, signOut, setHydrated]);
}

/**
 * 要求已登录:未登录则跳转 /login。返回是否已就绪(可渲染受保护内容)。
 */
export function useRequireAuth(): { ready: boolean; authed: boolean } {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (hydrated && !token) {
      // 带上当前路径,登录后回到原页面(如直接访问 /games/bullfighting)
      const target =
        pathname && pathname !== '/login'
          ? `/login?redirect=${encodeURIComponent(pathname)}`
          : '/login';
      router.replace(target);
    }
  }, [hydrated, token, router, pathname]);

  return { ready: hydrated, authed: Boolean(token) };
}
