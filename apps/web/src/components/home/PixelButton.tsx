'use client';

import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 实心强调(青底深字)用于主 CTA;默认描边态 */
  solid?: boolean;
}

/**
 * 像素风按钮(门户专用)。基类 .btn-pixel 定义霓虹边 + 硬投影 + 机械按压手感;
 * 与卡通的 CartoonButton 风格刻意对立,不复用。
 */
export function PixelButton({ solid, className, children, ...rest }: PixelButtonProps) {
  return (
    <button
      className={clsx(
        'btn-pixel',
        solid && 'bg-neon-cyan text-pixel-void shadow-neon-cyan',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
