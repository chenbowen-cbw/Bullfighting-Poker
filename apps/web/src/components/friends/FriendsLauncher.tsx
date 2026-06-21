'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/client/store';
import { CartoonModal } from '@/components/ui/CartoonModal';
import { FriendsPanel } from './FriendsPanel';

/**
 * 大厅里的"好友"入口:一个按钮 + 好友面板弹窗。
 *
 * 好友实时通知(请求/接受/邀请)已由 AppShell 内的 FriendNotifications 全局处理,
 * 此处不再重复订阅,只负责打开好友面板(打开即拉取最新列表)。
 */
export function FriendsLauncher() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-cartoon bg-grape px-4 py-2 text-sm text-chalk"
      >
        👥 好友
      </button>

      <CartoonModal open={open} title="好友" onClose={() => setOpen(false)}>
        <FriendsPanel />
      </CartoonModal>
    </>
  );
}
