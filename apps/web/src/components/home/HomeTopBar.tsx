'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/client/store';
import { useToast } from '@/components/ui/Toast';

/** 门户顶栏:像素 Logo + 登录态(未登录→登录/注册;已登录→昵称/筹码/登出)。 */
export function HomeTopBar() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const signOut = useAuthStore((s) => s.signOut);
  const pushToast = useToast((s) => s.push);

  function handleLogout() {
    signOut();
    pushToast('info', '已退出,下次再来~');
  }

  return (
    <header className="flex items-center justify-between gap-3 py-4">
      <Link href="/" className="flex items-center gap-2">
        <span className="bg-neon-cyan px-1.5 py-1 font-pixel text-xs text-pixel-void shadow-pixel-sm">
          ◣
        </span>
        <span className="font-pixel text-xs uppercase tracking-wide text-pixel-text">
          像素游戏厅
        </span>
      </Link>

      {/* 右侧:hydration 前留位防闪烁 */}
      <div className="flex h-9 items-center gap-2">
        {!hydrated ? null : token && user ? (
          <>
            <span className="hidden items-center gap-1 font-pixel-body text-lg text-pixel-dim sm:flex">
              <span className="text-neon-lime">●</span> {user.nickname}
            </span>
            <span className="hidden bg-pixel-surface px-2 py-1 font-pixel-body text-lg text-neon-yellow ring-1 ring-neon-yellow/40 sm:inline">
              🪙 {user.chips.toLocaleString()}
            </span>
            <button
              onClick={handleLogout}
              className="border-2 border-pixel-border px-3 py-1.5 font-pixel text-[9px] uppercase text-pixel-dim transition-colors hover:border-neon-magenta hover:text-neon-magenta"
            >
              登出
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="border-2 border-neon-cyan px-3 py-1.5 font-pixel text-[9px] uppercase text-neon-cyan transition-all hover:bg-neon-cyan hover:text-pixel-void"
            >
              登录
            </Link>
            <Link
              href="/register"
              className="border-2 border-neon-magenta bg-neon-magenta px-3 py-1.5 font-pixel text-[9px] uppercase text-pixel-void transition-all hover:shadow-neon-magenta"
            >
              注册
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
