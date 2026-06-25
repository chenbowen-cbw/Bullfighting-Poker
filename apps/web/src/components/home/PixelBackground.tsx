'use client';

import { useEffect, useRef } from 'react';

/**
 * 动态像素星空背景(canvas)。霓虹色像素点缓慢上浮 + 闪烁,铺在门户最底层。
 * - pointer-events:none,不挡交互;
 * - 尊重 prefers-reduced-motion:静止渲染一帧;
 * - 页面隐藏(切后台)时暂停 rAF,省电。
 */
export function PixelBackground() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const context = el.getContext('2d');
    if (!context) return;
    // 声明为非空类型的局部常量,使嵌套函数闭包内保持非空(规避收窄丢失)
    const cvs: HTMLCanvasElement = el;
    const ctx: CanvasRenderingContext2D = context;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const COLORS = ['#00f0ff', '#ff2e97', '#ffe600', '#e6e8ff'];
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;

    type Star = { x: number; y: number; s: number; v: number; c: string; tw: number; tp: number };
    let stars: Star[] = [];

    function rand(n: number) {
      return Math.random() * n;
    }

    function build() {
      w = cvs.clientWidth;
      h = cvs.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cvs.width = Math.floor(w * dpr);
      cvs.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // 密度随面积自适应,移动端更稀疏
      const count = Math.min(120, Math.floor((w * h) / 14000));
      stars = Array.from({ length: count }, () => ({
        x: rand(w),
        y: rand(h),
        s: Math.random() < 0.18 ? 3 : 2, // 偶尔大一点的像素块
        v: 0.15 + rand(0.45),
        c: COLORS[Math.floor(rand(COLORS.length))],
        tw: rand(Math.PI * 2),
        tp: 0.6 + rand(1.4),
      }));
    }

    function draw(twinkle: boolean) {
      ctx.clearRect(0, 0, w, h);
      for (const st of stars) {
        const alpha = twinkle ? 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(st.tw)) : 0.7;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = st.c;
        // crisp 像素块
        ctx.fillRect(Math.round(st.x), Math.round(st.y), st.s, st.s);
      }
      ctx.globalAlpha = 1;
    }

    let raf = 0;
    let last = 0;
    function frame(t: number) {
      const dt = last ? (t - last) / 16.67 : 1;
      last = t;
      for (const st of stars) {
        st.y -= st.v * dt;
        st.tw += 0.04 * st.tp * dt;
        if (st.y < -4) {
          st.y = h + 4;
          st.x = rand(w);
        }
      }
      draw(true);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      cancelAnimationFrame(raf);
      if (reduce) {
        draw(false);
        return;
      }
      last = 0;
      raf = requestAnimationFrame(frame);
    }

    function onResize() {
      build();
      start();
    }
    function onVisibility() {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!reduce) start();
    }

    build();
    start();
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
  );
}
