'use client';

import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import type { GameAccent, GameEntry } from '@/lib/games/types';
import { useEnterGame } from '@/lib/games/useEnterGame';
import { StatusBadge } from './StatusBadge';

/** accent token → 完整字面量类名(Tailwind 需要完整类名才能被打包保留)。 */
const ACCENT: Record<
  GameAccent,
  { text: string; hoverBorder: string; hoverShadow: string; chip: string }
> = {
  cyan: {
    text: 'text-neon-cyan',
    hoverBorder: 'group-hover:border-neon-cyan',
    hoverShadow: 'group-hover:shadow-neon-cyan',
    chip: 'text-neon-cyan/80 ring-neon-cyan/40',
  },
  magenta: {
    text: 'text-neon-magenta',
    hoverBorder: 'group-hover:border-neon-magenta',
    hoverShadow: 'group-hover:shadow-neon-magenta',
    chip: 'text-neon-magenta/80 ring-neon-magenta/40',
  },
  yellow: {
    text: 'text-neon-yellow',
    hoverBorder: 'group-hover:border-neon-yellow',
    hoverShadow: 'group-hover:shadow-neon-yellow',
    chip: 'text-neon-yellow/80 ring-neon-yellow/40',
  },
  lime: {
    text: 'text-neon-lime',
    hoverBorder: 'group-hover:border-neon-lime',
    hoverShadow: 'group-hover:shadow-neon-lime',
    chip: 'text-neon-lime/80 ring-neon-lime/40',
  },
};

export function GameCard({ game }: { game: GameEntry }) {
  const enterGame = useEnterGame();
  const reduce = useReducedMotion();
  const accent = ACCENT[game.accent];
  const isLive = game.status === 'live';

  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
      }}
      whileHover={reduce ? undefined : { y: -6 }}
      className={clsx(
        'group relative flex flex-col overflow-hidden rounded-pixel border-2 border-pixel-border bg-pixel-surface shadow-pixel transition-[box-shadow,border-color]',
        accent.hoverBorder,
        accent.hoverShadow,
        !isLive && 'opacity-75',
      )}
    >
      {/* 封面 */}
      <div className="relative overflow-hidden border-b border-pixel-grid">
        <img
          src={game.cover}
          alt={game.title}
          className={clsx(
            'aspect-[4/3] w-full object-cover [image-rendering:pixelated]',
            !isLive && 'grayscale-[0.4]',
          )}
        />
        {/* 扫描光带(仅 live 播放) */}
        {isLive && !reduce && (
          <div className="pointer-events-none absolute inset-0 -skew-x-12 animate-scan-sweep bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        )}
        {/* coming-soon 暗色蒙版 */}
        {!isLive && <div className="absolute inset-0 bg-pixel-void/40" />}
        <div className="absolute right-2 top-2">
          <StatusBadge status={game.status} />
        </div>
      </div>

      {/* 信息区 */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className={clsx('font-pixel text-[11px] uppercase tracking-wide', accent.text)}>
          {game.subtitle}
        </div>
        <h3 className="font-pixel-body text-2xl leading-none text-pixel-text">{game.title}</h3>
        <p className="text-base leading-snug text-pixel-dim">{game.tagline}</p>

        {/* 标签 */}
        <div className="mt-1 flex flex-wrap gap-1.5">
          {game.tags.map((t) => (
            <span
              key={t}
              className={clsx(
                'rounded-pixel px-2 py-0.5 font-pixel-body text-sm uppercase ring-1',
                accent.chip,
              )}
            >
              {t}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-auto pt-3">
          {isLive ? (
            <button
              onClick={() => game.entry && enterGame(game.entry)}
              className="btn-pixel w-full"
              aria-label={`进入${game.title}`}
            >
              ENTER ▸
            </button>
          ) : (
            <button disabled className="btn-pixel w-full" aria-label={`${game.title}即将上线`}>
              敬请期待
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
