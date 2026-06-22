'use client';

import type { ReactNode } from 'react';
import { useAuthBootstrap } from '@/lib/client/useAuth';
import { ToastViewport } from '@/components/ui/Toast';
import { FriendNotifications } from '@/components/friends/FriendNotifications';

/**
 * 客户端外壳:恢复登录态 + 挂载全局 toast 视口 + 全局好友通知。
 * 包裹在根布局内,让所有页面共享。
 *
 * 好友通知只在此处全局挂一次:无论身处大厅/牌桌/练习场/其它路由,
 * 都能收到好友请求/接受 toast 与进房邀请弹窗(各页面不再各自订阅)。
 */
export function AppShell({ children }: { children: ReactNode }) {
  useAuthBootstrap();
  return (
    <>
      <ToastViewport />
      <FriendNotifications />
      {children}
    </>
  );
}
