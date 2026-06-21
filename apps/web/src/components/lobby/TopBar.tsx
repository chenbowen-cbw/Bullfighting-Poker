'use client';

import { useRouter } from 'next/navigation';
import type { PublicUser } from '@/lib/client/types';
import { useAuthStore } from '@/lib/client/store';
import { useToast } from '@/components/ui/Toast';
import { BullMascot } from '@/components/ui/BullMascot';

interface TopBarProps {
  user: PublicUser | null;
}

/** 大厅顶栏:logo + 昵称/筹码 + 登出。 */
export function TopBar({ user }: TopBarProps) {
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const pushToast = useToast((s) => s.push);

  function handleLogout() {
    signOut();
    pushToast('info', '已退出,下次再来斗牛~');
    router.replace('/login');
  }

  return (
    <header className="cartoon-card mb-5 flex items-center justify-between gap-3 p-3">
      <div className="flex items-center gap-2">
        <BullMascot size={0.7} />
        <span className="text-xl font-extrabold text-ink">抢庄斗牛</span>
      </div>

      {user && (
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="badge-cartoon bg-chalk px-3 py-1 text-sm text-ink">
              😎 {user.nickname}
            </span>
            <span className="badge-cartoon bg-sunny px-3 py-1 text-sm text-ink">
              🪙 {user.chips.toLocaleString()}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="btn-cartoon bg-bull px-4 py-2 text-sm text-chalk"
          >
            登出
          </button>
        </div>
      )}
    </header>
  );
}
