'use client';

import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** 卡通按钮配色变体 */
type Variant = 'sunny' | 'tangerine' | 'sky' | 'grass' | 'bull' | 'grape' | 'ghost';

const VARIANT_CLASS: Record<Variant, string> = {
  sunny: 'bg-sunny text-ink',
  tangerine: 'bg-tangerine text-chalk',
  sky: 'bg-sky text-chalk',
  grass: 'bg-grass text-chalk',
  bull: 'bg-bull text-chalk',
  grape: 'bg-grape text-chalk',
  ghost: 'bg-chalk text-ink',
};

interface CartoonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** 加载态:禁用并显示转圈 */
  loading?: boolean;
  /** 占满整行 */
  fullWidth?: boolean;
  children: ReactNode;
}

/**
 * 卡通大按钮:厚描边、厚投影、按下"陷进去"的弹性手感。
 */
export function CartoonButton({
  variant = 'sunny',
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  ...rest
}: CartoonButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={clsx(
        'btn-cartoon',
        VARIANT_CLASS[variant],
        fullWidth && 'w-full',
        loading && 'cursor-wait',
        className,
      )}
    >
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-[3px] border-ink/30 border-t-ink"
        />
      )}
      {children}
    </button>
  );
}
