import { describe, it, expect, beforeEach } from 'vitest';
import { RoomService } from '../src/roomService';
import { InMemoryRoomRepository } from '../src/repository';
import { RoomError } from '../src/errors';
import type { RoomConfig } from '../src/types';

const baseConfig: RoomConfig = {
  name: '测试房',
  baseScore: 1,
  maxPlayers: 4,
  mode: 'rob_banker',
  minChips: 0,
};

function makeService(): RoomService {
  // 确定性但每次调用都变化的 rng,保证多房间码互不相同
  let seed = 1;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  return new RoomService(new InMemoryRoomRepository(), { rng });
}

describe('RoomService', () => {
  let svc: RoomService;
  beforeEach(() => {
    svc = makeService();
  });

  it('创建房间:房主自动入座 0 号位,状态 waiting,带房间码', async () => {
    const { room, seats } = await svc.createRoom('u1', baseConfig, 0);
    expect(room.status).toBe('waiting');
    expect(room.ownerId).toBe('u1');
    expect(room.roomCode).toHaveLength(6);
    expect(seats).toHaveLength(1);
    expect(seats[0]).toMatchObject({ userId: 'u1', seatNo: 0 });
  });

  it('非法配置被拒', async () => {
    await expect(svc.createRoom('u1', { ...baseConfig, maxPlayers: 1 }, 0)).rejects.toBeInstanceOf(
      RoomError,
    );
    await expect(svc.createRoom('u1', { ...baseConfig, baseScore: 0 }, 0)).rejects.toMatchObject({
      code: 'INVALID_CONFIG',
    });
  });

  it('加入房间:分配最小空位', async () => {
    const { room } = await svc.createRoom('u1', baseConfig, 0);
    const after = await svc.join(room.id, 'u2', 0);
    expect(after.seats).toHaveLength(2);
    const seat = after.seats.find((s) => s.userId === 'u2');
    expect(seat?.seatNo).toBe(1);
  });

  it('重复加入被拒', async () => {
    const { room } = await svc.createRoom('u1', baseConfig, 0);
    await expect(svc.join(room.id, 'u1', 0)).rejects.toMatchObject({ code: 'ALREADY_SEATED' });
  });

  it('房间满员被拒', async () => {
    const { room } = await svc.createRoom('u1', { ...baseConfig, maxPlayers: 2 }, 0);
    await svc.join(room.id, 'u2', 0);
    await expect(svc.join(room.id, 'u3', 0)).rejects.toMatchObject({ code: 'ROOM_FULL' });
  });

  it('带入筹码低于下限被拒', async () => {
    const { room } = await svc.createRoom('u1', { ...baseConfig, minChips: 100 }, 100);
    await expect(svc.join(room.id, 'u2', 50)).rejects.toMatchObject({ code: 'INSUFFICIENT_CHIPS' });
  });

  it('离开后空位可被新玩家复用', async () => {
    const { room } = await svc.createRoom('u1', baseConfig, 0);
    await svc.join(room.id, 'u2', 0); // 座位 1
    await svc.leave(room.id, 'u2');
    const after = await svc.join(room.id, 'u3', 0);
    expect(after.seats.find((s) => s.userId === 'u3')?.seatNo).toBe(1);
  });

  it('房主离开则移交给剩余最小座位玩家', async () => {
    const { room } = await svc.createRoom('u1', baseConfig, 0);
    await svc.join(room.id, 'u2', 0);
    const res = await svc.leave(room.id, 'u1');
    expect(res.closed).toBe(false);
    expect(res.room.ownerId).toBe('u2');
  });

  it('最后一人离开则房间关闭', async () => {
    const { room } = await svc.createRoom('u1', baseConfig, 0);
    const res = await svc.leave(room.id, 'u1');
    expect(res.closed).toBe(true);
    expect(res.room.status).toBe('closed');
  });

  it('不存在的房间操作抛 ROOM_NOT_FOUND', async () => {
    await expect(svc.getRoom('999')).rejects.toMatchObject({ code: 'ROOM_NOT_FOUND' });
  });

  it('listOpen 仅返回 waiting 房间', async () => {
    const a = await svc.createRoom('u1', baseConfig, 0);
    await svc.createRoom('u2', baseConfig, 0);
    await svc.leave(a.room.id, 'u1'); // 关闭 a
    const open = await svc.listOpen();
    expect(open).toHaveLength(1);
    expect(open[0].status).toBe('waiting');
  });

  it('markPlaying 把 waiting 房间置为 playing 并移出 listOpen(幂等)', async () => {
    const { room } = await svc.createRoom('u1', baseConfig, 0);
    await svc.markPlaying(room.id);
    expect((await svc.getRoom(room.id)).room.status).toBe('playing');
    expect(await svc.listOpen()).toHaveLength(0);
    await svc.markPlaying(room.id); // 再次调用保持 playing,不抛错
    expect((await svc.getRoom(room.id)).room.status).toBe('playing');
  });
});
