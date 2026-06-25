'use client';

import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 实心强调(青底深字)用于主 CTA;默认描边态 */
  solid?: boolean;
  /** 加载态:禁用并显示像素转圈 */
  loading?: boolean;
  /** 占满整行 */
  fullWidth?: boolean;
}

/**
 * 像素风按钮(门户/表单专用)。基类 .btn-pixel 定义霓虹边 + 硬投影 + 机械按压手感;
 * 与卡通的 CartoonButton 风格刻意对立,不复用。
 */
export function PixelButton({
  solid,
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  ...rest
}: PixelButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={clsx(
        'btn-pixel',
        solid && 'bg-neon-cyan text-pixel-void shadow-neon-cyan',
        fullWidth && 'w-full',
        loading && 'cursor-wait',
        className,
      )}
    >
      {loading && (
        <span
          aria-hidden
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
