'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { friendlyMessage, roomApi } from '@/lib/client/api';
import { useAuthStore } from '@/lib/client/store';
import { useFriendNotifications, type GameInviteNotice } from '@/lib/client/useFriendNotifications';
import { useToast } from '@/components/ui/Toast';
import { CartoonModal } from '@/components/ui/CartoonModal';
import { CartoonButton } from '@/components/ui/CartoonButton';
import { BullMascot } from '@/components/ui/BullMascot';

/**
 * 从当前路径解析所在房间 id(用于忽略"邀请我进我已在的房间")。
 * - /room/{id} → PvP 房间 id;
 * - /pve/{id}  → 练习房 id;
 * - 其它路由 → null。
 */
function currentRoomIdFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  const room = pathname.match(/^\/room\/([^/]+)/);
  if (room) return decodeURIComponent(room[1]);
  const pve = pathname.match(/^\/pve\/([^/]+)/);
  if (pve) return decodeURIComponent(pve[1]);
  return null;
}

/**
 * 全局好友通知:为已登录用户**全局只挂一次**(在 AppShell 内),
 * 这样无论身处大厅 / 牌桌 / 练习场 / 其它路由,都能收到:
 * - friend:request / friend:accept → toast;
 * - friend:invite → 弹出"加入房间"卡通弹窗。
 *
 * 行为约束:
 * - 忽略「邀请我进入我当前已在的房间」(按路径解析 roomId 比对);
 * - 已有邀请弹窗打开时,忽略后续重复邀请(避免叠弹/抖动)。
 *
 * 各页面不再各自订阅 useFriendNotifications,统一由此处理,避免重复 toast。
 */
export function FriendNotifications() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const pushToast = useToast((s) => s.push);

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
    } else if (n.type === 'friend:invite') {
      const here = currentRoomIdFromPath(pathname);
      // 已在被邀请的房间内 → 忽略;已有邀请弹窗 → 忽略后续重复邀请
      setInvite((prev) => {
        if (prev) return prev;
        if (n.roomId === here) return prev;
        return n;
      });
    }
    // notice 每次新事件都是新对象,作为依赖即可保证每条只处理一次;
    // pushToast/router 为稳定引用,pathname 在事件到达时通过闭包读取最新值即可。
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
  );
}
