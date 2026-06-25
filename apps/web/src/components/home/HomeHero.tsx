'use client';

import { motion } from 'framer-motion';
import { liveGames } from '@/lib/games/registry';
import { useEnterGame } from '@/lib/games/useEnterGame';

/** 门户 Hero:glitch 故障大标题 + 霓虹副标 + 主 CTA(进入首个 live 游戏)。 */
export function HomeHero() {
  const enterGame = useEnterGame();
  const primaryEntry = liveGames()[0]?.entry;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative flex flex-col items-center gap-5 py-14 text-center sm:py-20"
    >
      <span className="font-pixel text-[10px] uppercase tracking-[0.3em] text-neon-magenta">
        ▚ Pixel Poker Arcade ▞
      </span>

      <h1
        data-text="PIXEL ARCADE"
        className="glitch font-pixel text-2xl leading-[1.5] text-pixel-text sm:text-4xl sm:leading-[1.5]"
      >
        PIXEL ARCADE
      </h1>

      <p className="max-w-xl font-pixel-body text-xl text-pixel-dim sm:text-2xl">
        像素游戏厅 · 牌局集结地 —— 抢庄斗牛火热进行中,更多游戏即将上线
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        {primaryEntry && (
          <button
            onClick={() => enterGame(primaryEntry)}
            className="btn-pixel bg-neon-cyan text-pixel-void shadow-neon-cyan"
          >
            ▶ 立即开玩
          </button>
        )}
        <a href="#games" className="btn-pixel border-neon-magenta text-neon-magenta">
          浏览全部游戏 ↓
        </a>
      </div>
    </motion.section>
  );
}
