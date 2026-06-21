'use client';

import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import type { Card } from '@/lib/client/types';
import { SUIT_SYMBOL, cardLabel, isRedSuit, rankLabel } from '@/lib/client/cards';

/** 卡牌尺寸预设 */
type CardSize = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<CardSize, string> = {
  sm: 'h-16 w-12 text-sm',
  md: 'h-24 w-[4.5rem] text-lg',
  lg: 'h-32 w-24 text-2xl',
};

interface PlayingCardProps {
  /** 牌面;为 null 表示背面(未亮牌) */
  card: Card | null;
  /** 是否翻到正面 */
  faceUp: boolean;
  size?: CardSize;
  /** 出场延迟(秒),用于发牌依次入场 */
  delay?: number;
  className?: string;
}

/**
 * 扑克牌组件,含 3D 翻牌(flip)动画。
 * - 背面:卡通公牛花纹。
 * - 正面:A/2-10/J/Q/K + 花色,红(♥♦)黑(♠♣),厚描边。
 */
export function PlayingCard({ card, faceUp, size = 'md', delay = 0, className }: PlayingCardProps) {
  const showFace = faceUp && card !== null;
  const red = card ? isRedSuit(card.suit) : false;

  return (
    <motion.div
      className={clsx('relative shrink-0 [perspective:1000px]', SIZE_CLASS[size], className)}
      initial={{ y: -40, opacity: 0, rotate: -8 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22, delay }}
      aria-label={card && showFace ? cardLabel(card) : '暗牌'}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: showFace ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      >
        {/* 背面 */}
        <div className="absolute inset-0 [backface-visibility:hidden]">
          <CardBack size={size} />
        </div>
        {/* 正面(预旋转 180°,翻转后正对观众) */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {card ? <CardFace card={card} red={red} size={size} /> : <CardBack size={size} />}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** 牌背:卡通公牛 + 斜纹 */
function CardBack({ size }: { size: CardSize }) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-card border-4 border-ink bg-tangerine shadow-card">
      <div
        className="flex h-full w-full items-center justify-center"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0 8px, transparent 8px 16px)',
        }}
      >
        <span
          role="img"
          aria-hidden
          className="drop-shadow"
          style={{ fontSize: size === 'sm' ? '1.2rem' : size === 'md' ? '1.8rem' : '2.6rem' }}
        >
          🐂
        </span>
      </div>
    </div>
  );
}

/** 牌面:四角点数+花色,中央大花色 */
function CardFace({ card, red, size }: { card: Card; red: boolean; size: CardSize }) {
  const color = red ? 'text-bull' : 'text-ink';
  const symbol = SUIT_SYMBOL[card.suit];
  const label = rankLabel(card.rank);
  const centerSize = size === 'sm' ? 'text-2xl' : size === 'md' ? 'text-4xl' : 'text-6xl';

  return (
    <div
      className={clsx(
        'relative flex h-full w-full flex-col rounded-card border-4 border-ink bg-chalk p-1 shadow-card',
        color,
      )}
    >
      {/* 左上角 */}
      <div className="flex flex-col items-center self-start leading-none">
        <span className="font-extrabold">{label}</span>
        <span>{symbol}</span>
      </div>
      {/* 中央大花色 */}
      <div className={clsx('flex flex-1 items-center justify-center', centerSize)} aria-hidden>
        {symbol}
      </div>
      {/* 右下角(旋转 180°) */}
      <div className="flex rotate-180 flex-col items-center self-start leading-none">
        <span className="font-extrabold">{label}</span>
        <span>{symbol}</span>
      </div>
    </div>
  );
}
