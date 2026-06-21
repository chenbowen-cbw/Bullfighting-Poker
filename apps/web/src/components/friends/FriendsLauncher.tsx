'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { friendlyMessage, roomApi } from '@/lib/client/api';
import { useAuthStore } from '@/lib/client/store';
import { useFriendNotifications, type GameInviteNotice } from '@/lib/client/useFriendNotifications';
import { useToast } from '@/components/ui/Toast';
import { CartoonModal } from '@/components/ui/CartoonModal';
import { CartoonButton } from '@/components/ui/CartoonButton';
import { BullMascot } from '@/components/ui/BullMascot';
import { FriendsPanel } from './FriendsPanel';

/**
 * 大厅里的"好友"入口:一个按钮 + 好友面板弹窗。
 * 同时订阅个人实时频道:
 * - friend:request / friend:accept → 弹 toast 并刷新面板;
 * - friend:invite → 弹出"好友邀请你一起斗牛"的卡通弹窗,点"加入"即入房。
 */
export function FriendsLauncher() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const pushToast = useToast((s) => s.push);

  const [open, setOpen] = useState(false);
  /** 面板刷新信号:每次相关通知到达就 +1,触发面板重新拉取 */
  const [refreshSignal, setRefreshSignal] = useState(0);
  /** 待处理的游戏邀请(弹窗展示) */
  const [invite, setInvite] = useState<GameInviteNotice | null>(null);
  const [joining, setJoining] = useState(false);

  const notice = useFriendNotifications(user?.id ?? null);

  // 消费最近一条通知(useFriendNotifications 用自增 seq 保证每条只处理一次)
  useEffect(() => {
    if (!notice) return;
    const n = notice.notice;
    if (n.type === 'friend:request') {
      pushToast('info', `${n.from.nickname} 申请加你为好友`);
      setRefreshSignal((s) => s + 1);
    } else if (n.type === 'friend:accept') {
      pushToast('success', `${n.from.nickname} 接受了你的好友请求 🎉`);
      setRefreshSignal((s) => s + 1);
    } else if (n.type === 'friend:invite') {
      setInvite(n);
    }
    // notice 每次新事件都是新对象,作为依赖即可保证每条只处理一次;
    // pushToast 为 zustand 稳定引用,无需列入。
  }, [notice]);

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
        👥 好友
      </button>

      <CartoonModal open={open} title="好友" onClose={() => setOpen(false)}>
        <FriendsPanel refreshSignal={refreshSignal} />
      </CartoonModal>

      {/* 收到游戏邀请 */}
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
