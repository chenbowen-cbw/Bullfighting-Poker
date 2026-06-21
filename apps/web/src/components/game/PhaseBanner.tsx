'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { GamePhase } from '@/lib/client/types';
import { CountdownRing } from './CountdownRing';

/** 阶段 → 文案/emoji/配色 */
const PHASE_META: Record<GamePhase, { label: string; emoji: string; cls: string }> = {
  waiting: { label: '等待开局', emoji: '🪑', cls: 'bg-sky text-chalk' },
  rob_banker: { label: '抢庄中', emoji: '👑', cls: 'bg-tangerine text-chalk' },
  betting: { label: '下注中', emoji: '🎲', cls: 'bg-grape text-chalk' },
  reveal: { label: '亮牌啦', emoji: '🃏', cls: 'bg-grass text-chalk' },
  settled: { label: '本局结算', emoji: '💰', cls: 'bg-sunny text-ink' },
};

interface PhaseBannerProps {
  phase: GamePhase;
  deadline: number | null;
}

/** 阶段横幅 + 圆形倒计时,横幅随阶段切换弹性更替。 */
export function PhaseBanner({ phase, deadline }: PhaseBannerProps) {
  const meta = PHASE_META[phase];
  return (
    <div className="flex items-center gap-3">
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ y: -16, opacity: 0, scale: 0.85 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 16, opacity: 0, scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
          className={`badge-cartoon px-5 py-2 text-lg ${meta.cls}`}
        >
          <span aria-hidden className="text-xl">
            {meta.emoji}
          </span>
          {meta.label}
        </motion.div>
      </AnimatePresence>
      {(phase === 'rob_banker' || phase === 'betting' || phase === 'reveal') && (
        <CountdownRing deadline={deadline} />
      )}
    </div>
  );
}
