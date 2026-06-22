'use client';

import { useState, type FormEvent } from 'react';
import { friendlyMessage, pveApi, type StartPveInput } from '@/lib/client/api';
import { useToast } from '@/components/ui/Toast';
import { CartoonButton } from '@/components/ui/CartoonButton';

interface PveSetupFormProps {
  /** 开局成功:回传练习房 roomId(由父组件跳转) */
  onStarted: (roomId: string) => void;
}

const DIFFICULTIES: { value: StartPveInput['difficulty']; label: string; emoji: string }[] = [
  { value: 'easy', label: '简单', emoji: '🟢' },
  { value: 'medium', label: '中等', emoji: '🟡' },
  { value: 'hard', label: '困难', emoji: '🔴' },
];

/** 底分允许范围(与后端 startPveSchema 的 baseScore 上下限保持一致) */
const MIN_BASE_SCORE = 1;
const MAX_BASE_SCORE = 1000;

/** 人机练习设置:难度 / 机器人数量 / 底分。提交后开局并进入练习场。 */
export function PveSetupForm({ onStarted }: PveSetupFormProps) {
  const pushToast = useToast((s) => s.push);
  const [difficulty, setDifficulty] = useState<StartPveInput['difficulty']>('medium');
  const [botCount, setBotCount] = useState(3);
  const [baseScore, setBaseScore] = useState(10);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { roomId } = await pveApi.start({ difficulty, botCount, baseScore });
      pushToast('success', '练习场已就绪,出发!🤖');
      onStarted(roomId);
    } catch (err) {
      pushToast('error', friendlyMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* 难度 */}
      <div className="flex flex-col gap-1">
        <span className="px-2 text-sm font-extrabold text-ink/70">难度</span>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDifficulty(d.value)}
              className={
                'btn-cartoon px-3 py-2 text-sm ' +
                (difficulty === d.value ? 'bg-tangerine text-chalk' : 'bg-chalk text-ink')
              }
            >
              {d.emoji} {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="px-2 text-sm font-extrabold text-ink/70">机器人数量</span>
          <input
            className="input-cartoon"
            type="number"
            min={1}
            max={9}
            value={botCount}
            onChange={(e) => setBotCount(Math.min(9, Math.max(1, Number(e.target.value) || 1)))}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="px-2 text-sm font-extrabold text-ink/70">底分</span>
          <input
            className="input-cartoon"
            type="number"
            min={MIN_BASE_SCORE}
            max={MAX_BASE_SCORE}
            value={baseScore}
            onChange={(e) =>
              setBaseScore(
                Math.min(
                  MAX_BASE_SCORE,
                  Math.max(MIN_BASE_SCORE, Number(e.target.value) || MIN_BASE_SCORE),
                ),
              )
            }
            required
          />
          <span className="px-2 text-xs font-semibold text-ink/40">
            可填 {MIN_BASE_SCORE}–{MAX_BASE_SCORE}
          </span>
        </label>
      </div>

      <p className="px-2 text-xs font-semibold text-ink/50">
        练习模式:不消耗真实筹码、不计战绩。共 {botCount + 1} 人(含你)。
      </p>

      <CartoonButton type="submit" variant="grass" fullWidth loading={busy} className="mt-1">
        🚀 开始练习
      </CartoonButton>
    </form>
  );
}
