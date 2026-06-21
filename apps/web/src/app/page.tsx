'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import type { Room } from '@/lib/client/types';
import { friendlyMessage, roomApi } from '@/lib/client/api';
import { useAuthStore } from '@/lib/client/store';
import { useRequireAuth } from '@/lib/client/useAuth';
import { useToast } from '@/components/ui/Toast';
import { CartoonButton } from '@/components/ui/CartoonButton';
import { CartoonModal } from '@/components/ui/CartoonModal';
import { BullMascot } from '@/components/ui/BullMascot';
import { TopBar } from '@/components/lobby/TopBar';
import { RoomCard } from '@/components/lobby/RoomCard';
import { CreateRoomForm } from '@/components/lobby/CreateRoomForm';
import { PveSetupForm } from '@/components/lobby/PveSetupForm';
import { FriendsLauncher } from '@/components/friends/FriendsLauncher';

/** 大厅:房间列表、创建房间、快速匹配、个人信息。 */
export default function LobbyPage() {
  const router = useRouter();
  const { ready, authed } = useRequireAuth();
  const user = useAuthStore((s) => s.user);
  const pushToast = useToast((s) => s.push);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPve, setShowPve] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);

  // 拉取房间列表
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { rooms } = await roomApi.list();
      setRooms(rooms);
    } catch (err) {
      pushToast('error', friendlyMessage(err));
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    if (authed) void refresh();
  }, [authed, refresh]);

  // 加入房间
  async function handleJoin(room: Room) {
    if (joiningId) return;
    setJoiningId(room.id);
    try {
      await roomApi.join(room.id, room.minChips);
      router.push(`/room/${room.id}`);
    } catch (err) {
      pushToast('error', friendlyMessage(err));
      setJoiningId(null);
    }
  }

  // 快速匹配(默认底分 10)
  async function handleQuickMatch() {
    if (matching) return;
    setMatching(true);
    try {
      const result = await roomApi.quickMatch(10);
      if (result.status === 'matched') {
        pushToast('success', '匹配成功,出发!');
        router.push(`/room/${result.room.room.id}`);
      } else {
        pushToast('info', '已加入匹配队列,凑齐就开局~ 先逛逛大厅吧');
        await refresh();
      }
    } catch (err) {
      pushToast('error', friendlyMessage(err));
    } finally {
      setMatching(false);
    }
  }

  if (!ready) {
    return <CenterLoading text="加载中…" />;
  }
  if (!authed) {
    return <CenterLoading text="正在前往登录…" />;
  }

  return (
    <main className="mx-auto max-w-5xl p-4">
      <TopBar user={user} />

      {/* 动作横幅 */}
      <section className="cartoon-card mb-5 flex flex-col items-center gap-3 bg-felt/10 p-5 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-3">
          <BullMascot size={1.1} float />
          <div>
            <h1 className="text-2xl font-extrabold text-ink">来斗一把!</h1>
            <p className="font-semibold text-ink/60">快速匹配,或自己开一桌</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <CartoonButton variant="sky" loading={matching} onClick={handleQuickMatch}>
            ⚡ 快速匹配
          </CartoonButton>
          <CartoonButton variant="grass" onClick={() => setShowCreate(true)}>
            ➕ 创建房间
          </CartoonButton>
          <CartoonButton variant="grape" onClick={() => setShowPve(true)}>
            🤖 人机练习
          </CartoonButton>
          <FriendsLauncher />
        </div>
      </section>

      {/* 房间列表 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-ink">🏠 开放中的房间</h2>
          <button
            onClick={() => void refresh()}
            className="btn-cartoon bg-chalk px-4 py-2 text-sm"
            disabled={loading}
          >
            🔄 刷新
          </button>
        </div>

        {loading ? (
          <CenterLoading text="正在找房间…" inline />
        ) : rooms.length === 0 ? (
          <EmptyRooms onCreate={() => setShowCreate(true)} />
        ) : (
          <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  busy={joiningId === room.id}
                  onJoin={handleJoin}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* 创建房间弹窗 */}
      <CartoonModal open={showCreate} title="创建房间" onClose={() => setShowCreate(false)}>
        <CreateRoomForm
          onCreated={(created) => {
            setShowCreate(false);
            router.push(`/room/${created.room.id}`);
          }}
        />
      </CartoonModal>

      {/* 人机练习弹窗 */}
      <CartoonModal open={showPve} title="人机练习" onClose={() => setShowPve(false)}>
        <PveSetupForm
          onStarted={(roomId) => {
            setShowPve(false);
            router.push(`/pve/${roomId}`);
          }}
        />
      </CartoonModal>
    </main>
  );
}

/** 居中加载提示 */
function CenterLoading({ text, inline }: { text: string; inline?: boolean }) {
  return (
    <div
      className={
        inline
          ? 'flex items-center justify-center py-16'
          : 'flex min-h-screen items-center justify-center'
      }
    >
      <div className="flex flex-col items-center gap-2">
        <BullMascot size={1} float />
        <span className="text-lg font-extrabold text-ink/70">{text}</span>
      </div>
    </div>
  );
}

/** 空房间占位 */
function EmptyRooms({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="cartoon-card flex flex-col items-center gap-3 p-10 text-center">
      <BullMascot size={1.4} float />
      <p className="text-lg font-extrabold text-ink">还没有开放的房间</p>
      <p className="font-semibold text-ink/60">当第一个开桌的人吧!</p>
      <CartoonButton variant="grass" onClick={onCreate}>
        ➕ 创建房间
      </CartoonButton>
    </div>
  );
}
