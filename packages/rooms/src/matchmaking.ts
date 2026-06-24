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

/**
 * 匹配结果指针:记录「某用户已被匹配进某房」。
 *
 * 解决两个问题:
 * 1) 被匹配但非触发者的玩家,再次轮询时可直接 `takeMatch` 发现房间,而不会被重新入队;
 * 2) 已匹配者的「重复入队」竞态(pop 后 isQueued=false → 又 enqueue)。
 * 生产用 Redis(带 TTL)实现,测试用内存实现。
 */
export interface MatchedRegistry {
  /** 标记这些用户已匹配进 roomId(通常带 TTL) */
  markMatched(userIds: string[], roomId: string): Promise<void>;
  /** 原子取出并清除某用户的匹配指针;无则返回 null */
  takeMatch(userId: string): Promise<string | null>;
}

/** 内存匹配指针(测试用) */
export class InMemoryMatchedRegistry implements MatchedRegistry {
  private readonly map = new Map<string, string>();

  async markMatched(userIds: string[], roomId: string): Promise<void> {
    for (const id of userIds) this.map.set(id, roomId);
  }

  async takeMatch(userId: string): Promise<string | null> {
    const roomId = this.map.get(userId) ?? null;
    if (roomId !== null) this.map.delete(userId);
    return roomId;
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
  private readonly matched?: MatchedRegistry;
  private readonly matchSize: number;
  private readonly roomMaxPlayers: number;

  constructor(
    queue: MatchmakingQueue,
    roomService: RoomService,
    config: MatchmakingConfig = {},
    matched?: MatchedRegistry,
  ) {
    this.queue = queue;
    this.roomService = roomService;
    this.matched = matched;
    this.matchSize = config.matchSize ?? 4;
    this.roomMaxPlayers = config.roomMaxPlayers ?? config.matchSize ?? 4;
  }

  async quickMatch(userId: string, baseScore: number): Promise<QuickMatchResult> {
    // 已被匹配进房(典型为非触发者的下一次轮询):直接发现房间,绝不重新入队。
    if (this.matched) {
      const matchedRoomId = await this.matched.takeMatch(userId);
      if (matchedRoomId) {
        return { status: 'matched', room: await this.roomService.getRoom(matchedRoomId) };
      }
    }

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
      const room = await this.roomService.getRoom(created.room.id);

      // 给「非本次触发者」留下匹配指针:他们下次轮询即可发现房间(实时推送在路由层做)。
      const others = group.filter((id) => id !== userId);
      if (this.matched && others.length > 0) {
        await this.matched.markMatched(others, created.room.id);
      }

      // 并发下本人可能不在本组(他人触发的 pop 取走了前 N 个),此时本人仍在队列继续等。
      return group.includes(userId) ? { status: 'matched', room } : { status: 'queued' };
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
