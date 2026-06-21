'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { BullMascot } from '@/components/ui/BullMascot';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

/** 登录/注册共用的卡通容器:漂浮公牛 + 厚边框卡片。 */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.92 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        className="cartoon-card w-full max-w-md p-7"
      >
        <div className="mb-5 flex flex-col items-center text-center">
          <BullMascot size={1.2} float />
          <h1 className="mt-2 text-3xl font-extrabold text-ink">{title}</h1>
          <p className="text-base font-semibold text-ink/60">{subtitle}</p>
        </div>
        {children}
        <div className="mt-5 text-center text-sm font-semibold text-ink/70">{footer}</div>
      </motion.div>
    </main>
  );
}
