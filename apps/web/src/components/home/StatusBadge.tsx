import type { GameStatus } from '@/lib/games/types';

/** 游戏状态角标:LIVE(青,脉冲) / COMING SOON(黄,静止)。 */
export function StatusBadge({ status }: { status: GameStatus }) {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1 bg-neon-cyan px-2 py-1 font-pixel text-[9px] uppercase tracking-wider text-pixel-void shadow-pixel-sm">
        <span className="h-1.5 w-1.5 animate-led-pulse rounded-full bg-pixel-void" />
        LIVE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center bg-pixel-raised px-2 py-1 font-pixel text-[9px] uppercase tracking-wider text-neon-yellow shadow-pixel-sm ring-1 ring-neon-yellow/50">
      SOON
    </span>
  );
}
