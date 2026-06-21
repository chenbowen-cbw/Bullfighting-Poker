import { describe, it, expect } from 'vitest';
import { InMemoryMatchmakingQueue, MatchmakingService } from '../src/matchmaking';
import { RoomService } from '../src/roomService';
import { InMemoryRoomRepository } from '../src/repository';

function makeService(matchSize: number) {
  const queue = new InMemoryMatchmakingQueue();
  const roomService = new RoomService(new InMemoryRoomRepository(), { rng: () => 0.5 });
  const mm = new MatchmakingService(queue, roomService, { matchSize });
  return { queue, mm };
}

describe('MatchmakingService', () => {
  it('人数不足时排队', async () => {
    const { mm } = makeService(2);
    const r = await mm.quickMatch('u1', 1);
    expect(r.status).toBe('queued');
  });

  it('凑齐人数后自动建房并全部入座', async () => {
    const { mm } = makeService(2);
    await mm.quickMatch('u1', 1); // 排队
    const r = await mm.quickMatch('u2', 1); // 凑齐
    expect(r.status).toBe('matched');
    if (r.status === 'matched') {
      expect(r.room.seats).toHaveLength(2);
      const ids = r.room.seats.map((s) => s.userId).sort();
      expect(ids).toEqual(['u1', 'u2']);
      expect(r.room.room.ownerId).toBe('u1');
    }
  });

  it('重复 quickMatch 不会重复入队', async () => {
    const { queue, mm } = makeService(3);
    await mm.quickMatch('u1', 1);
    await mm.quickMatch('u1', 1);
    expect(await queue.isQueued(1, 'u1')).toBe(true);
    // 再来一人仍不足 3,保持排队
    const r = await mm.quickMatch('u2', 1);
    expect(r.status).toBe('queued');
  });

  it('不同底分档位互不干扰', async () => {
    const { mm } = makeService(2);
    await mm.quickMatch('u1', 1);
    const r = await mm.quickMatch('u2', 5); // 不同档位
    expect(r.status).toBe('queued');
  });

  it('匹配成功后双方退出队列', async () => {
    const { queue, mm } = makeService(2);
    await mm.quickMatch('u1', 1);
    await mm.quickMatch('u2', 1);
    expect(await queue.isQueued(1, 'u1')).toBe(false);
    expect(await queue.isQueued(1, 'u2')).toBe(false);
  });

  it('cancel 可取消排队', async () => {
    const { queue, mm } = makeService(2);
    await mm.quickMatch('u1', 1);
    await mm.cancel('u1', 1);
    expect(await queue.isQueued(1, 'u1')).toBe(false);
  });

  it('建房失败时把已匹配玩家重新入队(不被吞掉)', async () => {
    const queue = new InMemoryMatchmakingQueue();
    const failingRoomService = {
      createRoom: async () => {
        throw new Error('db down');
      },
    } as unknown as RoomService;
    const mm = new MatchmakingService(queue, failingRoomService, { matchSize: 2 });
    await mm.quickMatch('u1', 1);
    await expect(mm.quickMatch('u2', 1)).rejects.toThrow('db down');
    expect(await queue.isQueued(1, 'u1')).toBe(true);
    expect(await queue.isQueued(1, 'u2')).toBe(true);
  });
});
