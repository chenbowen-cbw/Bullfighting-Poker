'use client';

import { motion } from 'framer-motion';
import { sortedGames } from '@/lib/games/registry';
import { GameCard } from './GameCard';

/** 游戏卡片墙:消费注册表,入场 stagger 浮现。 */
export function GameGrid() {
  const games = sortedGames();
  return (
    <motion.div
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      {games.map((g) => (
        <GameCard key={g.id} game={g} />
      ))}
    </motion.div>
  );
}
