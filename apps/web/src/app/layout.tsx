import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Press_Start_2P, VT323 } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/AppShell';

/**
 * 像素字体(自托管,满足 CSP `font-src 'self'`):
 * - Press Start 2P:8-bit 大标题/数字/角标(英数为主)
 * - VT323:可读性更好的像素正文/说明
 * 仅暴露为 CSS 变量;实际只在门户首页 `.theme-pixel` 作用域内通过 `font-pixel` 类生效,
 * 不影响卡通页面字体。
 */
const pressStart = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start',
  display: 'swap',
});

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-vt323',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '像素游戏厅 · 抢庄斗牛',
  description: '暗黑像素风的多游戏平台:抢庄斗牛火热进行中,更多牌局即将上线。',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh">
      <body className={`min-h-screen ${pressStart.variable} ${vt323.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
