'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ApiError, friendlyMessage, gameApi, roomApi } from '@/lib/client/api';
import { useAuthStore, useGameStore } from '@/lib/client/store';
import { useRequireAuth } from '@/lib/client/useAuth';
import { useRealtime } from '@/lib/client/useRealtime';
import { useTimeoutTick } from '@/lib/client/useTimeoutTick';
import { deriveWaitingState } from '@/lib/client/derive';
import type { RoomWithSeats } from '@/lib/client/types';
import { useToast } from '@/components/ui/Toast';
import { BullMascot } from '@/components/ui/BullMascot';
import { GameTable } from '@/components/game/GameTable';
import { PhaseBanner } from '@/components/game/PhaseBanner';
import { ActionBar } from '@/components/game/ActionBar';
import { RoomInviteButton } from '@/components/friends/RoomInviteButton';

/** 牌桌页:实时对局核心界面。 */
export default function RoomPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const roomId = params.id;

  const { ready, authed } = useRequireAuth();
  const user = useAuthStore((s) => s.user);
  const pushToast = useToast((s) => s.push);

  const game = useGameStore((s) => s.state);
  const connection = useGameStore((s) => s.connection);
  const setGame = useGameStore((s) => s.setState);
  const resetGame = useGameStore((s) => s.reset);

  const [room, setRoom] = useState<RoomWithSeats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  /** 对局后端是否在线(/sync 可用) */
  const [gameBackendOnline, setGameBackendOnline] = useState(false);

  // 拉房间 + 尝试拉对局态
  const loadAll = useCallback(async () => {
    try {
      const data = await roomApi.get(roomId);
      setRoom(data);
      // 尝试对局态;后端未上线则回退到等待态
      try {
        const state = await gameApi.sync(roomId);
        setGame(state);
        setGameBackendOnline(true);
      } catch (err) {
        if (err instanceof ApiError && err.isBackendMissing) {
          setGameBackendOnline(false);
          setGame(deriveWaitingState(data));
        } else {
          throw err;
        }
      }
    } catch (err) {
      pushToast('error', friendlyMessage(err));
    } finally {
      setLoading(false);
    }
  }, [roomId, setGame, pushToast]);

  useEffect(() => {
    if (authed) void loadAll();
    return () => resetGame();
  }, [authed, loadAll, resetGame]);

  // 实时订阅(后端未上线时 hook 内部会自动降级为 offline)
  useRealtime(authed ? roomId : null, user?.id ?? null);

  // 轮询兜底:对局后端在线但实时未连上时,每 2.5s 同步一次
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!authed || !gameBackendOnline) return;
    if (connection === 'online') {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    pollRef.current = setInterval(() => {
      gameApi
        .sync(roomId)
        .then(setGame)
        .catch(() => {
          /* 轮询失败静默 */
        });
    }, 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [authed, gameBackendOnline, connection, roomId, setGame]);

  // 超时兜底:本阶段 deadline 过去后催服务端推进一次(防 QStash 未触发导致卡阶段)
  useTimeoutTick(authed && gameBackendOnline ? roomId : null, game?.deadline ?? null, setGame);

  // ── 动作 ──
  function guardBackend(): boolean {
    if (!gameBackendOnline) {
      pushToast('info', '对局服务即将上线,敬请期待 🐂');
      return false;
    }
    return true;
  }

  async function runAction(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      pushToast('error', friendlyMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const handleStart = () => guardBackend() && runAction(() => gameApi.start(roomId).then(setGame));
  const handleRob = (m: number) =>
    guardBackend() && runAction(() => gameApi.robBanker(roomId, m).then(setGame));
  const handleBet = (m: number) =>
    guardBackend() && runAction(() => gameApi.bet(roomId, m).then(setGame));
  const handleReveal = () =>
    guardBackend() && runAction(() => gameApi.reveal(roomId).then(setGame));

  async function handleLeave() {
    if (busy) return;
    setBusy(true);
    try {
      await roomApi.leave(roomId);
      pushToast('info', '已离开房间');
      router.push('/');
    } catch (err) {
      pushToast('error', friendlyMessage(err));
      setBusy(false);
    }
  }

  if (!ready || (!game && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <BullMascot size={1.2} float />
          <span className="text-lg font-extrabold text-ink/70">进入牌桌中…</span>
        </div>
      </div>
    );
  }
  if (!authed) return null;

  const isOwner = room?.room.ownerId === user?.id;
  const me = game?.players.find((p) => p.seatId === user?.id);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-3">
      {/* 顶栏 */}
      <header className="cartoon-card flex items-center justify-between gap-2 p-3">
        <button onClick={handleLeave} className="btn-cartoon bg-bull px-4 py-2 text-sm text-chalk">
          ← 离开
        </button>
        <div className="flex flex-col items-center text-center">
          <span className="text-lg font-extrabold text-ink">{room?.room.name ?? '牌桌'}</span>
          {room && (
            <span className="text-xs font-bold text-ink/50">房间号 #{room.room.roomCode}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <RoomInviteButton roomId={roomId} />
          <ConnectionPill state={connection} backendOnline={gameBackendOnline} />
        </div>
      </header>

      {/* 阶段横幅 + 倒计时 */}
      {game && (
        <div className="flex justify-center">
          <PhaseBanner phase={game.phase} deadline={game.deadline} />
        </div>
      )}

      {/* 牌桌 */}
      {game && (
        <div className="flex-1">
          <GameTable game={game} selfUserId={user?.id ?? null} />
        </div>
      )}

      {/* 后端未上线提示 */}
      {!gameBackendOnline && (
        <div className="cartoon-card bg-sunny/20 p-3 text-center text-sm font-bold text-ink/70">
          🛠️ 对局玩法服务即将上线;当前展示真实座位,开局后即可实时对战。
        </div>
      )}

      {/* 动作区 */}
      {game && (
        <ActionBar
          phase={game.phase}
          me={me}
          isOwner={Boolean(isOwner)}
          busy={busy}
          onStart={handleStart}
          onRob={handleRob}
          onBet={handleBet}
          onReveal={handleReveal}
        />
      )}
    </main>
  );
}

/** 实时连接状态小药丸 */
function ConnectionPill({
  state,
  backendOnline,
}: {
  state: 'idle' | 'connecting' | 'online' | 'offline';
  backendOnline: boolean;
}) {
  if (!backendOnline) {
    return <span className="badge-cartoon bg-chalk px-3 py-1 text-xs text-ink/60">观战</span>;
  }
  const map = {
    idle: { cls: 'bg-chalk text-ink/60', text: '待连接' },
    connecting: { cls: 'bg-sky text-chalk', text: '连接中' },
    online: { cls: 'bg-grass text-chalk', text: '实时在线' },
    offline: { cls: 'bg-bull text-chalk', text: '离线轮询' },
  } as const;
  const m = map[state];
  return <span className={`badge-cartoon px-3 py-1 text-xs ${m.cls}`}>● {m.text}</span>;
}
