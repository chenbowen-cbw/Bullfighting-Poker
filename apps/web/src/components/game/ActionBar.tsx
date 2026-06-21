'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { GamePhase, PublicPlayer } from '@/lib/client/types';
import { CartoonButton } from '@/components/ui/CartoonButton';

interface ActionBarProps {
  phase: GamePhase;
  /** 当前登录玩家在本局中的状态(可能为 undefined,例如旁观) */
  me: PublicPlayer | undefined;
  /** 是否房主(用于"开始游戏"按钮) */
  isOwner: boolean;
  /** 提交中(锁按钮) */
  busy: boolean;
  onStart: () => void;
  onRob: (multiplier: number) => void;
  onBet: (multiplier: number) => void;
  onReveal: () => void;
}

const ROB_OPTIONS = [0, 1, 2, 3, 4];
const BET_OPTIONS = [1, 2, 3, 4, 5];

/** 抢庄倍数 → 标签 */
function robLabel(m: number): string {
  return m === 0 ? '不抢' : `${m}倍`;
}

/**
 * 动作区:按阶段呈现大号弹性按钮。
 * - waiting:房主可"开始游戏"。
 * - rob_banker:抢庄 0/1/2/3/4 倍。
 * - betting:下注 1–5 倍。
 * - reveal:亮牌。
 * 已决策则显示"等待其他玩家"。
 */
export function ActionBar({
  phase,
  me,
  isOwner,
  busy,
  onStart,
  onRob,
  onBet,
  onReveal,
}: ActionBarProps) {
  const [selected, setSelected] = useState<number | null>(null);

  // 是否已在本阶段做出决策
  const robbed = me?.robMultiplier !== null && me?.robMultiplier !== undefined;
  const betted = me?.betMultiplier !== null && me?.betMultiplier !== undefined;

  return (
    <div className="cartoon-card flex min-h-[7rem] w-full flex-col items-center justify-center gap-3 bg-cream/95 p-4">
      <AnimatePresence mode="wait">
        {phase === 'waiting' && (
          <Frame key="waiting">
            {isOwner ? (
              <CartoonButton variant="grass" loading={busy} onClick={onStart}>
                🚀 开始游戏
              </CartoonButton>
            ) : (
              <Hint text="等房主开局,坐稳啦~ 🪑" />
            )}
          </Frame>
        )}

        {phase === 'rob_banker' && (
          <Frame key="rob">
            {robbed ? (
              <Hint text={`你已选择「${robLabel(me!.robMultiplier!)}」,等待其他玩家…`} />
            ) : (
              <>
                <Title text="要抢庄吗?" />
                <div className="flex flex-wrap justify-center gap-2">
                  {ROB_OPTIONS.map((m) => (
                    <CartoonButton
                      key={m}
                      variant={m === 0 ? 'ghost' : 'tangerine'}
                      loading={busy && selected === m}
                      disabled={busy}
                      onClick={() => {
                        setSelected(m);
                        onRob(m);
                      }}
                    >
                      {robLabel(m)}
                    </CartoonButton>
                  ))}
                </div>
              </>
            )}
          </Frame>
        )}

        {phase === 'betting' && (
          <Frame key="bet">
            {betted ? (
              <Hint text={`你已下注「${me!.betMultiplier}倍」,等待开牌…`} />
            ) : (
              <>
                <Title text="下注几倍?" />
                <div className="flex flex-wrap justify-center gap-2">
                  {BET_OPTIONS.map((m) => (
                    <CartoonButton
                      key={m}
                      variant="grape"
                      loading={busy && selected === m}
                      disabled={busy}
                      onClick={() => {
                        setSelected(m);
                        onBet(m);
                      }}
                    >
                      {m}倍
                    </CartoonButton>
                  ))}
                </div>
              </>
            )}
          </Frame>
        )}

        {phase === 'reveal' && (
          <Frame key="reveal">
            <CartoonButton variant="sky" loading={busy} onClick={onReveal}>
              🃏 亮牌!
            </CartoonButton>
          </Frame>
        )}

        {phase === 'settled' && (
          <Frame key="settled">
            <Hint text="本局结束,下一局马上开始 🎉" />
          </Frame>
        )}
      </AnimatePresence>
    </div>
  );
}

/** 带弹性切换的容器 */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -8 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className="flex flex-col items-center gap-2"
    >
      {children}
    </motion.div>
  );
}

function Title({ text }: { text: string }) {
  return <div className="text-lg font-extrabold text-ink">{text}</div>;
}

function Hint({ text }: { text: string }) {
  return <div className="text-base font-semibold text-ink/70">{text}</div>;
}
