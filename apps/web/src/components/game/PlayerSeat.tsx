'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import type { GamePhase, PublicPlayer } from '@/lib/client/types';
import { NiuBadge } from './NiuBadge';
import { PlayingCard } from './PlayingCard';

/** 给每个座位一个稳定的可爱头像 emoji(按座位号取) */
const AVATARS = ['🐂', '🐮', '🐷', '🐸', '🐵', '🦊', '🐰', '🐼', '🐯', '🦁'];

interface PlayerSeatProps {
  player: PublicPlayer;
  phase: GamePhase;
  /** 是否为当前登录玩家(高亮) */
  isSelf: boolean;
  /** 是否为庄家 */
  isBanker: boolean;
}

/**
 * 环绕牌桌的座位:头像 + 昵称 + 筹码 + 牛型徽章 + 庄家皇冠,
 * 下注/抢庄倍数气泡,结算时盈亏数字弹跳。
 */
export function PlayerSeat({ player, phase, isSelf, isBanker }: PlayerSeatProps) {
  const avatar = AVATARS[player.seatId % AVATARS.length];
  const revealed = phase === 'reveal' || phase === 'settled';
  const settled = phase === 'settled';

  // 决策气泡文案
  let actionBubble: string | null = null;
  if (phase === 'rob_banker' && player.robMultiplier !== null) {
    actionBubble = player.robMultiplier === 0 ? '不抢' : `抢 ${player.robMultiplier}倍`;
  } else if (phase === 'betting' && player.betMultiplier !== null) {
    actionBubble = `下注 ${player.betMultiplier}倍`;
  }

  return (
    <div
      className={clsx(
        'relative flex w-36 flex-col items-center gap-1 rounded-cartoon border-4 p-2 transition-colors',
        isSelf ? 'border-tangerine bg-sunny/30' : 'border-ink/70 bg-chalk/80',
      )}
    >
      {/* 庄家皇冠 */}
      {isBanker && (
        <motion.span
          initial={{ y: -8, scale: 0 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 16 }}
          className="absolute -top-5 left-1/2 -translate-x-1/2 text-2xl drop-shadow"
          aria-label="庄家"
        >
          👑
        </motion.span>
      )}

      {/* 头像 */}
      <div
        className={clsx(
          'flex h-14 w-14 items-center justify-center rounded-full border-4 border-ink bg-chalk text-3xl',
          isBanker && 'ring-4 ring-tangerine',
        )}
      >
        <span aria-hidden>{avatar}</span>
      </div>

      {/* 昵称 */}
      <div className="max-w-full truncate text-sm font-extrabold text-ink">
        {player.nickname}
        {isSelf && <span className="text-tangerine"> (我)</span>}
      </div>

      {/* 筹码 */}
      <div className="badge-cartoon bg-sunny px-2 py-0.5 text-xs text-ink">
        <span aria-hidden>🪙</span>
        {player.chips.toLocaleString()}
      </div>

      {/* 牛型徽章(亮牌后) */}
      {revealed && player.niuType && <NiuBadge type={player.niuType} className="text-xs" />}

      {/* 决策气泡 */}
      <AnimatePresence>
        {actionBubble && (
          <motion.div
            key={actionBubble}
            initial={{ scale: 0, y: 6 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 480, damping: 20 }}
            className="badge-cartoon absolute -right-3 -top-3 bg-grape px-2 py-0.5 text-[0.7rem] text-chalk"
          >
            {actionBubble}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 手牌(本人可见 / 亮牌后全部可见) */}
      {player.cards && player.cards.length > 0 && (
        <div className="mt-1 flex justify-center -space-x-3">
          {player.cards.map((c, i) => (
            <PlayingCard
              key={`${c.suit}-${c.rank}-${i}`}
              card={c}
              faceUp={isSelf || revealed}
              size="sm"
              delay={i * 0.06}
            />
          ))}
        </div>
      )}

      {/* 结算盈亏数字 */}
      <AnimatePresence>
        {settled && player.delta !== null && (
          <motion.div
            initial={{ y: 0, opacity: 0, scale: 0.6 }}
            animate={{ y: -28, opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 18 }}
            className={clsx(
              'pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 text-xl font-extrabold drop-shadow',
              player.delta >= 0 ? 'text-grass' : 'text-bull',
            )}
          >
            {player.delta >= 0 ? `+${player.delta}` : player.delta}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
