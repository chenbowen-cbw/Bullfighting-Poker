import { describe, it, expect } from 'vitest';
import {
  InMemoryMatchmakingQueue,
  MatchmakingService,
  InMemoryMatchedRegistry,
} from '../src/matchmaking';
import { RoomService } from '../src/roomService';
import { InMemoryRoomRepository } from '../src/repository';

function makeService(matchSize: number) {
  const queue = new InMemoryMatchmakingQueue();
  const roomService = new RoomService(new InMemoryRoomRepository(), { rng: () => 0.5 });
  const mm = new MatchmakingService(queue, roomService, { matchSize });
  return { queue, mm };
}

function makeServiceMatched(matchSize: number) {
  const queue = new InMemoryMatchmakingQueue();
  const matched = new InMemoryMatchedRegistry();
  const roomService = new RoomService(new InMemoryRoomRepository(), { rng: () => 0.5 });
  const mm = new MatchmakingService(queue, roomService, { matchSize }, matched);
  return { queue, matched, mm };
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

  it('被匹配的非触发者再次轮询时直接发现房间,且不被重新入队', async () => {
    const { queue, mm } = makeServiceMatched(2);
    await mm.quickMatch('u1', 1); // u1 排队
    const triggered = await mm.quickMatch('u2', 1); // u2 触发匹配
    expect(triggered.status).toBe('matched');
    const roomId = triggered.status === 'matched' ? triggered.room.room.id : '';

    // u1(非触发者)再次轮询:应直接发现同一房间,而非被重新塞回队列
    const found = await mm.quickMatch('u1', 1);
    expect(found.status).toBe('matched');
    if (found.status === 'matched') expect(found.room.room.id).toBe(roomId);
    expect(await queue.isQueued(1, 'u1')).toBe(false);
  });

  it('匹配指针为一次性:消费后再次轮询回到排队', async () => {
    const { mm } = makeServiceMatched(2);
    await mm.quickMatch('u1', 1);
    await mm.quickMatch('u2', 1);
    const first = await mm.quickMatch('u1', 1); // 命中指针 → matched
    expect(first.status).toBe('matched');
    const second = await mm.quickMatch('u1', 1); // 指针已消费 → 重新排队
    expect(second.status).toBe('queued');
  });
});
