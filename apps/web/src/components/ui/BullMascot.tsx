'use client';

import { clsx } from 'clsx';

interface BullMascotProps {
  /** 字号(rem 倍数),默认 1 */
  size?: number;
  /** 是否上下漂浮 */
  float?: boolean;
  className?: string;
}

/**
 * 🐂 公牛吉祥物。用 emoji 点题,可选漂浮动画。
 */
export function BullMascot({ size = 1, float = false, className }: BullMascotProps) {
  return (
    <span
      role="img"
      aria-label="公牛吉祥物"
      className={clsx('inline-block leading-none', float && 'animate-float', className)}
      style={{ fontSize: `${size * 2.5}rem` }}
    >
      🐂
    </span>
  );
}
