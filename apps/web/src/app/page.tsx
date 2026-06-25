'use client';

import { PixelBackground } from '@/components/home/PixelBackground';
import { HomeTopBar } from '@/components/home/HomeTopBar';
import { HomeHero } from '@/components/home/HomeHero';
import { GameGrid } from '@/components/home/GameGrid';

/**
 * 多游戏门户首页(暗黑像素风 + 动态效果)。
 * 公开可访问:未登录可浏览全部游戏,点 live 游戏时才引导登录(带 redirect 回跳)。
 * 全部样式收在 .theme-pixel 作用域内,不影响卡通风的游戏页面。
 */
export default function HomePage() {
  return (
    <main className="theme-pixel pixel-scanlines relative min-h-screen overflow-hidden">
      <PixelBackground />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16">
        <HomeTopBar />
        <HomeHero />

        <section id="games" className="scroll-mt-8">
          <div className="mb-5 flex items-end justify-between gap-3 border-b border-pixel-grid pb-3">
            <h2 className="font-pixel text-sm uppercase tracking-wide text-pixel-text">
              ▸ 游戏大厅
            </h2>
            <span className="font-pixel-body text-base text-pixel-dim">SELECT YOUR GAME</span>
          </div>
          <GameGrid />
        </section>

        <footer className="mt-16 border-t border-pixel-grid pt-6 text-center font-pixel-body text-base text-pixel-faint">
          PIXEL POKER ARCADE · 像素游戏厅 — 更多游戏陆续上线
        </footer>
      </div>
    </main>
  );
}
