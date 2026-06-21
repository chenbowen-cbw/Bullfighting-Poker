import type { RoomService } from './roomService';
import type { RoomConfig, RoomWithSeats } from './types';

/** 匹配队列抽象。生产用 Redis 实现,测试用内存实现。 */
export interface MatchmakingQueue {
  enqueue(baseScore: number, userId: string): Promise<void>;
  isQueued(baseScore: number, userId: string): Promise<boolean>;
  remove(baseScore: number, userId: string): Promise<void>;
  /** 原子地取出恰好 size 个排队者;不足则返回 null 且不改变队列 */
  popGroup(baseScore: number, size: number): Promise<string[] | null>;
}

/** 内存匹配队列(测试用,无需 Redis) */
export class InMemoryMatchmakingQueue implements MatchmakingQueue {
  private readonly queues = new Map<number, string[]>();
  private readonly members = new Map<number, Set<string>>();

  private queueOf(baseScore: number): string[] {
    let q = this.queues.get(baseScore);
    if (!q) {
      q = [];
      this.queues.set(baseScore, q);
    }
    return q;
  }

  private memberOf(baseScore: number): Set<string> {
    let m = this.members.get(baseScore);
    if (!m) {
      m = new Set();
      this.members.set(baseScore, m);
    }
    return m;
  }

  async enqueue(baseScore: number, userId: string): Promise<void> {
    const members = this.memberOf(baseScore);
    if (members.has(userId)) return;
    members.add(userId);
    this.queueOf(baseScore).push(userId);
  }

  async isQueued(baseScore: number, userId: string): Promise<boolean> {
    return this.memberOf(baseScore).has(userId);
  }

  async remove(baseScore: number, userId: string): Promise<void> {
    this.memberOf(baseScore).delete(userId);
    const q = this.queueOf(baseScore);
    const idx = q.indexOf(userId);
    if (idx >= 0) q.splice(idx, 1);
  }

  async popGroup(baseScore: number, size: number): Promise<string[] | null> {
    const q = this.queueOf(baseScore);
    if (q.length < size) return null;
    const group = q.splice(0, size);
    const members = this.memberOf(baseScore);
    for (const id of group) members.delete(id);
    return group;
  }
}

export interface MatchmakingConfig {
  /** 凑齐开局的人数,默认 4 */
  matchSize?: number;
  /** 匹配房间容量,默认等于 matchSize */
  roomMaxPlayers?: number;
}

export type QuickMatchResult = { status: 'matched'; room: RoomWithSeats } | { status: 'queued' };

/** 快速匹配服务:按底分档位排队,凑齐人数后自动建房并入座。 */
export class MatchmakingService {
  private readonly queue: MatchmakingQueue;
  private readonly roomService: RoomService;
  private readonly matchSize: number;
  private readonly roomMaxPlayers: number;

  constructor(queue: MatchmakingQueue, roomService: RoomService, config: MatchmakingConfig = {}) {
    this.queue = queue;
    this.roomService = roomService;
    this.matchSize = config.matchSize ?? 4;
    this.roomMaxPlayers = config.roomMaxPlayers ?? config.matchSize ?? 4;
  }

  async quickMatch(userId: string, baseScore: number): Promise<QuickMatchResult> {
    if (!(await this.queue.isQueued(baseScore, userId))) {
      await this.queue.enqueue(baseScore, userId);
    }

    const group = await this.queue.popGroup(baseScore, this.matchSize);
    if (!group) return { status: 'queued' };

    const config: RoomConfig = {
      name: `快速匹配 ${baseScore}`,
      baseScore,
      maxPlayers: this.roomMaxPlayers,
      mode: 'rob_banker',
      minChips: 0,
    };
    try {
      const created = await this.roomService.createRoom(group[0], config, 0);
      for (const otherId of group.slice(1)) {
        await this.roomService.join(created.room.id, otherId, 0);
      }
      return { status: 'matched', room: await this.roomService.getRoom(created.room.id) };
    } catch (err) {
      // 建房/入座失败:把已取出的玩家重新入队,避免他们既不在队列也不在房间里被"卡住"
      for (const id of group) {
        await this.queue.enqueue(baseScore, id);
      }
      throw err;
    }
  }

  async cancel(userId: string, baseScore: number): Promise<void> {
    await this.queue.remove(baseScore, userId);
  }
}
