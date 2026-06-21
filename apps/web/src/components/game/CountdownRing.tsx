'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';

interface CountdownRingProps {
  /** 截止时间(epoch ms);为 null 时不显示 */
  deadline: number | null;
  /** 该阶段总时长(ms),用于计算进度环,默认 15s */
  totalMs?: number;
  size?: number;
}

/**
 * 圆形倒计时:根据 deadline 实时倒数,进度环随剩余时间收缩。
 * 用 requestAnimationFrame 平滑刷新,组件卸载时清理。
 */
export function CountdownRing({ deadline, totalMs = 15000, size = 64 }: CountdownRingProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadline === null) return;
    let raf = 0;
    const tick = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [deadline]);

  if (deadline === null) return null;

  const remainMs = Math.max(0, deadline - now);
  const remainSec = Math.ceil(remainMs / 1000);
  const ratio = Math.max(0, Math.min(1, remainMs / totalMs));

  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // 低于 1/3 变红色告急
  const urgent = ratio <= 1 / 3;
  const ringColor = urgent ? '#ff5a5f' : '#2ecc71';

  return (
    <div
      className={clsx(
        'relative inline-flex items-center justify-center',
        urgent && 'animate-wiggle',
      )}
      style={{ width: size, height: size }}
      aria-label={`剩余 ${remainSec} 秒`}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* 轨道 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="#fffdf7"
          stroke="#3a2e2a"
          strokeWidth={stroke}
        />
        {/* 进度 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          style={{ transition: 'stroke-dashoffset 0.2s linear' }}
        />
      </svg>
      <span className="absolute text-xl font-extrabold text-ink">{remainSec}</span>
    </div>
  );
}
