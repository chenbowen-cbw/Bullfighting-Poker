import type { ReactNode } from 'react';

export const metadata = {
  title: '斗牛扑克',
  description: '抢庄斗牛 — 在线卡牌游戏',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
