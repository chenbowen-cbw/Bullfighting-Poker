'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { friendlyMessage, friendsApi, roomApi } from '@/lib/client/api';
import { useAuthStore } from '@/lib/client/store';
import { useFriendNotifications, type GameInviteNotice } from '@/lib/client/useFriendNotifications';
import type { PublicFriend } from '@/lib/client/types';
import { useToast } from '@/components/ui/Toast';
import { CartoonModal } from '@/components/ui/CartoonModal';
import { CartoonButton } from '@/components/ui/CartoonButton';
import { BullMascot } from '@/components/ui/BullMascot';
import { FriendsPanel } from './FriendsPanel';

interface RoomInviteButtonProps {
  /** 当前房间 id,用于邀请好友进入 */
  roomId: string;
}

/**
 * 牌桌内的"邀请好友"入口:
 * - 按钮打开好友面板,每个好友带"邀请"按钮 → friendsApi.invite(friendId, roomId);
 * - 同时订阅个人频道,处理好友请求/接受 toast 与(他人发来的)游戏邀请。
 */
export function RoomInviteButton({ roomId }: RoomInviteButtonProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const pushToast = useToast((s) => s.push);

  const [open, setOpen] = useState(false);
  const [invite, setInvite] = useState<GameInviteNotice | null>(null);
  const [joining, setJoining] = useState(false);

  const notice = useFriendNotifications(user?.id ?? null);

  useEffect(() => {
    if (!notice) return;
    const n = notice.notice;
    if (n.type === 'friend:request') {
      pushToast('info', `${n.from.nickname} 申请加你为好友`);
    } else if (n.type === 'friend:accept') {
      pushToast('success', `${n.from.nickname} 接受了你的好友请求 🎉`);
    } else if (n.type === 'friend:invite' && n.roomId !== roomId) {
      // 已在房间内,仅当邀请的是其它房间时才提示
      setInvite(n);
    }
    // notice 每次新事件都是新对象,作为依赖即可保证每条只处理一次;
    // roomId/pushToast 为稳定引用。
  }, [notice]);

  async function handleInvite(friend: PublicFriend) {
    try {
      await friendsApi.invite(friend.id, roomId);
      pushToast('success', `已邀请 ${friend.nickname} 进房 🎉`);
    } catch (err) {
      pushToast('error', friendlyMessage(err));
    }
  }

  async function handleJoinInvite() {
    if (!invite || joining) return;
    setJoining(true);
    try {
      await roomApi.join(invite.roomId, 0);
      pushToast('success', '已加入好友的房间,出发!');
      setInvite(null);
      router.push(`/room/${invite.roomId}`);
    } catch (err) {
      pushToast('error', friendlyMessage(err));
    } finally {
      setJoining(false);
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

      <CartoonModal open={Boolean(invite)} title="好友邀请" onClose={() => setInvite(null)}>
        <div className="flex flex-col items-center gap-3 text-center">
          <BullMascot size={1.2} float />
          <p className="text-lg font-extrabold text-ink">
            {invite?.fromUser.nickname} 邀请你一起斗牛!
          </p>
          {invite && <p className="text-sm font-bold text-ink/50">房间号 #{invite.roomCode}</p>}
          <div className="mt-1 flex gap-2">
            <CartoonButton variant="grass" loading={joining} onClick={handleJoinInvite}>
              🚪 加入
            </CartoonButton>
            <button
              onClick={() => setInvite(null)}
              className="btn-cartoon bg-chalk px-4 py-2 text-sm text-ink"
            >
              稍后再说
            </button>
          </div>
        </div>
      </CartoonModal>
    </>
  );
}
