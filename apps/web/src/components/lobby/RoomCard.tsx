'use client';

import { motion } from 'framer-motion';
import type { Room } from '@/lib/client/types';
import { CartoonButton } from '@/components/ui/CartoonButton';

interface RoomCardProps {
  room: Room;
  busy: boolean;
  onJoin: (room: Room) => void;
}

/** 大厅里的单个房间卡片。 */
export function RoomCard({ room, busy, onJoin }: RoomCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 360, damping: 26 }}
      className="cartoon-card flex flex-col gap-2 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-lg font-extrabold text-ink">{room.name}</h3>
        <span className="badge-cartoon bg-sky px-2 py-0.5 text-xs text-chalk">
          #{room.roomCode}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 text-sm font-bold text-ink/70">
        <span className="badge-cartoon bg-sunny px-2 py-0.5 text-xs text-ink">
          底分 {room.baseScore}
        </span>
        <span className="badge-cartoon bg-grass px-2 py-0.5 text-xs text-chalk">
          上限 {room.maxPlayers} 人
        </span>
        {room.minChips > 0 && (
          <span className="badge-cartoon bg-grape px-2 py-0.5 text-xs text-chalk">
            门槛 {room.minChips}
          </span>
        )}
      </div>
      <CartoonButton
        variant="tangerine"
        fullWidth
        loading={busy}
        onClick={() => onJoin(room)}
        className="mt-1 text-base"
      >
        🚪 进入房间
      </CartoonButton>
    </motion.div>
  );
}
