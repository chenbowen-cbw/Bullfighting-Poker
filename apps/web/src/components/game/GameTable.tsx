'use client';

import { motion } from 'framer-motion';
import type { PublicGameState } from '@/lib/client/types';
import { BullMascot } from '@/components/ui/BullMascot';
import { PlayerSeat } from './PlayerSeat';
import { PlayingCard } from './PlayingCard';

interface GameTableProps {
  game: PublicGameState;
  /** 当前登录用户 id */
  selfUserId: string | null;
  /**
   * 座位展示名解析器(可选)。默认用「座位 N」;
   * 人机练习页可据此把机器人显示为「机器人N」。
   */
  seatLabel?: (player: PublicGameState['players'][number]) => string;
  /** 判断座位是否为机器人(可选;默认全否,即 PvP 行为不变) */
  isBot?: (player: PublicGameState['players'][number]) => boolean;
}

/** 默认座位标签:对局公开态不含昵称,用座位号 */
function defaultSeatLabel(player: PublicGameState['players'][number]): string {
  return `座位 ${player.seatNo + 1}`;
}

/**
 * 椭圆卡通牌桌:座位沿椭圆环绕,中央是公牛 + 底分/庄家信息。
 * 把"我"固定排在最下方(顺时针重排),更符合手游直觉。
 */
export function GameTable({
  game,
  selfUserId,
  seatLabel = defaultSeatLabel,
  isBot,
}: GameTableProps) {
  const players = [...game.players].sort((a, b) => a.seatNo - b.seatNo);

  // 让自己排到列表首位(置于底部中央),其余顺时针排开
  const selfIdx = players.findIndex((p) => p.seatId === selfUserId);
  const ordered =
    selfIdx >= 0 ? [...players.slice(selfIdx), ...players.slice(0, selfIdx)] : players;

  const n = Math.max(ordered.length, 1);
  const selfPlayer = ordered.find((p) => p.seatId === selfUserId);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="relative aspect-[4/3] w-full">
        {/* 椭圆桌面 */}
        <div className="absolute inset-[8%] rounded-[50%] border-[10px] border-feltDark bg-felt shadow-cartoon-lg">
          {/* 内圈高光 */}
          <div className="absolute inset-4 rounded-[50%] border-4 border-white/20" />
        </div>

        {/* 中央信息 */}
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1">
          <BullMascot size={1.1} float />
          <div className="badge-cartoon bg-chalk px-3 py-1 text-sm text-ink">
            底分 {game.baseScore}
          </div>
          {game.bankerSeatId !== null && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="badge-cartoon bg-tangerine px-3 py-1 text-sm text-chalk"
            >
              👑 庄家 {bankerLabel(game, seatLabel)}
            </motion.div>
          )}
        </div>

        {/* 座位:沿椭圆分布。自己(index 0)在底部中央(角度 90°)。 */}
        {ordered.map((p, i) => {
          // 起点在底部(90°),顺时针铺开
          const angle = 90 + (360 / n) * i;
          const rad = (angle * Math.PI) / 180;
          // 椭圆半径(占容器百分比)
          const rx = 46;
          const ry = 42;
          const cx = 50 + rx * Math.cos(rad);
          const cy = 50 + ry * Math.sin(rad);
          // 垂直锚点:座位盒朝椭圆内侧展开(底部座位向上、顶部座位向下生长),
          // 避免最下方"我"的座位探出桌面下沿与底部动作区重叠;顶部座位同理不探出上沿。
          const ty = -50 * (1 + Math.sin(rad));
          return (
            <div
              key={p.seatId}
              className="absolute"
              style={{ left: `${cx}%`, top: `${cy}%`, transform: `translate(-50%, ${ty}%)` }}
            >
              <PlayerSeat
                player={p}
                phase={game.phase}
                displayName={seatLabel(p)}
                isSelf={p.seatId === selfUserId}
                isBanker={game.bankerSeatId === p.seatId}
                isBot={isBot?.(p) ?? false}
                hideHand={p.seatId === selfUserId}
              />
            </div>
          );
        })}
      </div>

      {/* 自己的手牌:从座位中抽离、置于桌下托盘,避免与底部动作区(亮牌按钮)重叠 */}
      {selfPlayer?.cards && selfPlayer.cards.length > 0 && (
        <div className="mt-3 flex justify-center -space-x-2">
          {selfPlayer.cards.map((c, i) => (
            <PlayingCard
              key={`${c.suit}-${c.rank}-${i}`}
              card={c}
              faceUp
              size="md"
              delay={i * 0.05}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** 取庄家座位标签(对局公开态无昵称,故用座位标签解析器) */
function bankerLabel(
  game: PublicGameState,
  seatLabel: (player: PublicGameState['players'][number]) => string,
): string {
  const banker = game.players.find((p) => p.seatId === game.bankerSeatId);
  return banker ? seatLabel(banker) : '';
}
