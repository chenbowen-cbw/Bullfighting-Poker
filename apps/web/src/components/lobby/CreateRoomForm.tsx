'use client';

import { useState, type FormEvent } from 'react';
import type { RoomWithSeats } from '@/lib/client/types';
import { friendlyMessage, roomApi } from '@/lib/client/api';
import { useToast } from '@/components/ui/Toast';
import { CartoonButton } from '@/components/ui/CartoonButton';

interface CreateRoomFormProps {
  onCreated: (room: RoomWithSeats) => void;
}

/** 创建房间表单(放在弹窗里)。 */
export function CreateRoomForm({ onCreated }: CreateRoomFormProps) {
  const pushToast = useToast((s) => s.push);
  const [name, setName] = useState('我的牌桌');
  const [baseScore, setBaseScore] = useState(10);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [buyIn, setBuyIn] = useState(0);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const room = await roomApi.create({
        name: name.trim() || '我的牌桌',
        baseScore,
        maxPlayers,
        minChips: 0,
        buyIn,
      });
      pushToast('success', '房间创建好啦,进去坐稳!');
      onCreated(room);
    } catch (err) {
      pushToast('error', friendlyMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="px-2 text-sm font-extrabold text-ink/70">房间名</span>
        <input
          className="input-cartoon"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={64}
          required
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="px-2 text-sm font-extrabold text-ink/70">底分</span>
          <input
            className="input-cartoon"
            type="number"
            min={1}
            value={baseScore}
            onChange={(e) => setBaseScore(Math.max(1, Number(e.target.value)))}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="px-2 text-sm font-extrabold text-ink/70">人数上限</span>
          <input
            className="input-cartoon"
            type="number"
            min={2}
            max={10}
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Math.min(10, Math.max(2, Number(e.target.value) || 2)))}
            required
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="px-2 text-sm font-extrabold text-ink/70">带入筹码(buy-in)</span>
        <input
          className="input-cartoon"
          type="number"
          min={0}
          value={buyIn}
          onChange={(e) => setBuyIn(Math.max(0, Number(e.target.value) || 0))}
        />
      </label>

      <CartoonButton type="submit" variant="grass" fullWidth loading={busy} className="mt-1">
        ✨ 创建并进入
      </CartoonButton>
    </form>
  );
}
