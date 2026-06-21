'use client';

import type { ReactNode } from 'react';
import { useAuthBootstrap } from '@/lib/client/useAuth';
import { ToastViewport } from '@/components/ui/Toast';

/**
 * 客户端外壳:恢复登录态 + 挂载全局 toast 视口。
 * 包裹在根布局内,让所有页面共享。
 */
export function AppShell({ children }: { children: ReactNode }) {
  useAuthBootstrap();
  return (
    <>
      <ToastViewport />
      {children}
    </>
  );
}
