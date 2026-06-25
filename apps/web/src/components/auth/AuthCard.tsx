'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { PixelBackground } from '@/components/home/PixelBackground';

interface AuthCardProps {
  /** 英文角标(像素字体,渲染锐利) */
  kicker: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

/**
 * 登录/注册共用的**暗黑像素**容器:与门户首页同一套视觉语言
 * (星空背景 + CRT 扫描线 + 霓虹像素面板),保证全站风格统一。
 */
export function AuthCard({ kicker, title, subtitle, children, footer }: AuthCardProps) {
  return (
    <main className="theme-pixel pixel-scanlines relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4">
      <PixelBackground />

      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="relative z-10 w-full max-w-md border-2 border-pixel-border bg-pixel-surface p-7 shadow-pixel"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <span
            data-text={kicker}
            className="glitch font-pixel text-base uppercase tracking-[0.2em] text-neon-cyan"
          >
            {kicker}
          </span>
          <h1 className="mt-3 font-pixel-body text-3xl leading-none text-pixel-text">{title}</h1>
          <p className="mt-2 font-pixel-body text-lg text-pixel-dim">{subtitle}</p>
        </div>

        {children}

        <div className="mt-6 text-center font-pixel-body text-base text-pixel-dim">{footer}</div>
      </motion.div>
    </main>
  );
}
