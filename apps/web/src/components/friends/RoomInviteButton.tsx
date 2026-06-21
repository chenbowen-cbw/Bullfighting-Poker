'use client';

import { useState } from 'react';
import { friendlyMessage, friendsApi } from '@/lib/client/api';
import { useAuthStore } from '@/lib/client/store';
import type { PublicFriend } from '@/lib/client/types';
import { useToast } from '@/components/ui/Toast';
import { CartoonModal } from '@/components/ui/CartoonModal';
import { FriendsPanel } from './FriendsPanel';

interface RoomInviteButtonProps {
  /** 当前房间 id,用于邀请好友进入 */
  roomId: string;
}

/**
 * 牌桌内的"邀请好友"入口:
 * - 按钮打开好友面板,每个好友带"邀请"按钮 → friendsApi.invite(friendId, roomId)。
 *
 * 收到的好友请求/接受/他人邀请等通知由 AppShell 内的 FriendNotifications 全局处理,
 * 此处不再重复订阅,避免重复 toast / 叠弹。
 */
export function RoomInviteButton({ roomId }: RoomInviteButtonProps) {
  const user = useAuthStore((s) => s.user);
  const pushToast = useToast((s) => s.push);
  const [open, setOpen] = useState(false);

  async function handleInvite(friend: PublicFriend) {
    try {
      await friendsApi.invite(friend.id, roomId);
      // 投递为尽力而为(对方离线则收不到),措辞如实告知
      pushToast('success', '邀请已发出(对方在线时会收到)');
    } catch (err) {
      pushToast('error', friendlyMessage(err));
    }
  }

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-cartoon bg-grape px-4 py-2 text-sm text-chalk"
      >
        👥 邀请好友
      </button>

      <CartoonModal open={open} title="邀请好友" onClose={() => setOpen(false)}>
        <FriendsPanel onInvite={handleInvite} />
      </CartoonModal>
    </>
  );
}
