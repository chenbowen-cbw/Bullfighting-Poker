'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { friendlyMessage, gameApi, pveApi } from '@/lib/client/api';
import { useAuthStore, useGameStore } from '@/lib/client/store';
import { useRequireAuth } from '@/lib/client/useAuth';
import { useRealtime } from '@/lib/client/useRealtime';
import type { GamePhase, PublicPlayer } from '@/lib/client/types';
import { useToast } from '@/components/ui/Toast';
import { CartoonButton } from '@/components/ui/CartoonButton';
import { BullMascot } from '@/components/ui/BullMascot';
import { GameTable } from '@/components/game/GameTable';
import { PhaseBanner } from '@/components/game/PhaseBanner';
import { ActionBar } from '@/components/game/ActionBar';

/** 机器人座位前缀(与后端 @bullfighting/game 的 BOT_SEAT_PREFIX 对齐) */
const BOT_PREFIX = 'bot:';

/** 是否为机器人座位 */
function isBotPlayer(p: PublicPlayer): boolean {
  return p.seatId.startsWith(BOT_PREFIX);
}

/** 座位展示名:机器人 → 机器人N;真人 → 座位N(公开态不含昵称) */
function seatLabel(p: PublicPlayer): string {
  if (isBotPlayer(p)) return `机器人${p.seatId.slice(BOT_PREFIX.length)}`;
  return `座位 ${p.seatNo + 1}`;
}

/**
 * 当前阶段人类是否仍欠一个动作(用于"轮到你啦!"提示)。
 * - rob_banker:尚未抢庄(robMultiplier==null);
 * - betting:非庄家且尚未下注(betMultiplier==null);
 * - reveal:尚未亮牌(!revealed)。
 */
function humanOwesAction(phase: GamePhase, me: PublicPlayer | undefined): boolean {
  if (!me) return false;
  switch (phase) {
    case 'rob_banker':
      return me.robMultiplier == null;
    case 'betting':
      return !me.isBanker && me.betMultiplier == null;
    case 'reveal':
      return !me.revealed;
    default:
      return false;
  }
}

/**
 * 人机练习牌桌页。
 *
 * 复用与 /room/[id] 相同的牌桌 UI(GameTable / PhaseBanner / ActionBar),
 * 但状态来源为 GET /api/game/{id}/sync + 实时频道,动作走既有 /api/game/{id}/{rob-banker,bet,reveal},
 * 结算后出现「下一局」按钮(POST /api/pve/{id}/next-round)。
 * 不拉取 /api/rooms/{id}(练习房无数据库房间)。
 */
export default function PvePage() {
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

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // 拉初始对局态(练习房只存在于 Redis,直接用 /sync)
  const loadState = useCallback(async () => {
    try {
      const state = await gameApi.sync(roomId);
      setGame(state);
    } catch (err) {
      pushToast('error', friendlyMessage(err));
    } finally {
      setLoading(false);
    }
  }, [roomId, setGame, pushToast]);

  useEffect(() => {
    if (authed) void loadState();
    return () => resetGame();
  }, [authed, loadState, resetGame]);

  // 实时订阅(频道 room:{id} + room:{id}:player:{userId});未连上时轮询兜底
  useRealtime(authed ? roomId : null, user?.id ?? null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!authed) return;
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
  }, [authed, connection, roomId, setGame]);

  // ── 动作 ──
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

  const handleRob = (m: number) => runAction(() => gameApi.robBanker(roomId, m).then(setGame));
  const handleBet = (m: number) => runAction(() => gameApi.bet(roomId, m).then(setGame));
  const handleReveal = () => runAction(() => gameApi.reveal(roomId).then(setGame));
  const handleNextRound = () => runAction(() => pveApi.nextRound(roomId).then(setGame));

  if (!ready || (!game && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <BullMascot size={1.2} float />
          <span className="text-lg font-extrabold text-ink/70">进入练习场中…</span>
        </div>
      </div>
    );
  }
  if (!authed) return null;

  const me = game?.players.find((p) => p.seatId === user?.id);
  // 轮到人类行动:高亮提示;否则(且未结算)说明机器人正在依次行动
  const myTurn = game ? humanOwesAction(game.phase, me) : false;
  const botsResolving = Boolean(
    game && !myTurn && game.phase !== 'settled' && game.phase !== 'waiting',
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-3">
      {/* 顶栏 */}
      <header className="cartoon-card flex items-center justify-between gap-2 p-3">
        <button
          onClick={() => router.push('/games/bullfighting')}
          className="btn-cartoon bg-bull px-4 py-2 text-sm text-chalk"
        >
          ← 离开
        </button>
        <div className="flex flex-col items-center text-center">
          <span className="text-lg font-extrabold text-ink">🤖 人机练习</span>
          <span className="text-xs font-bold text-ink/50">练习不计真实筹码 · 随时离开</span>
        </div>
        <span className="badge-cartoon bg-grass px-3 py-1 text-xs text-chalk">练习场</span>
      </header>

      {/* 阶段横幅 + 倒计时 */}
      {game && (
        <div className="flex flex-col items-center justify-center gap-2">
          <PhaseBanner phase={game.phase} deadline={game.deadline} />
          {/* 回合提示:轮到你时高亮跳动;机器人行动时给出轻提示 */}
          {myTurn && (
            <span className="badge-cartoon animate-bounce bg-tangerine px-4 py-1 text-sm text-chalk">
              👉 轮到你啦!
            </span>
          )}
          {botsResolving && (
            <span className="badge-cartoon bg-chalk px-4 py-1 text-sm text-ink/60">
              🤖 机器人行动中…
            </span>
          )}
        </div>
      )}

      {/* 牌桌:机器人座位显示「机器人N」+ 🤖 */}
      {game && (
        <div className="flex-1">
          <GameTable
            game={game}
            selfUserId={user?.id ?? null}
            seatLabel={seatLabel}
            isBot={isBotPlayer}
          />
        </div>
      )}

      {/* 动作区:waiting/由房主开局的逻辑在练习中不需要;结算后给「下一局」 */}
      {game && game.phase === 'settled' ? (
        <div className="cartoon-card flex min-h-[7rem] w-full flex-col items-center justify-center gap-3 bg-cream/95 p-4">
          <div className="text-lg font-extrabold text-ink">本局结束 🎉</div>
          <CartoonButton variant="grass" loading={busy} onClick={handleNextRound}>
            🔁 下一局
          </CartoonButton>
        </div>
      ) : (
        game && (
          <ActionBar
            phase={game.phase}
            me={me}
            isOwner={false}
            busy={busy}
            onStart={() => {
              /* 练习房由后端开局,无「开始游戏」 */
            }}
            onRob={handleRob}
            onBet={handleBet}
            onReveal={handleReveal}
          />
        )
      )}
    </main>
  );
}
