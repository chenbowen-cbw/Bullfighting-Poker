import type { Redis } from '@upstash/redis';
import type { GameState } from '@bullfighting/game';
import type { GameStateStore, PveRecord, PveRecordStore } from './gamePorts';

/** GameStateStore 的 Redis(Upstash)实现 */
export class RedisGameStateStore implements GameStateStore {
  constructor(private readonly redis: Redis) {}

  private key(roomId: string): string {
    return `game:${roomId}:state`;
  }

  async load(roomId: string): Promise<GameState | null> {
    return (await this.redis.get<GameState>(this.key(roomId))) ?? null;
  }

  async save(roomId: string, state: GameState): Promise<void> {
    await this.redis.set(this.key(roomId), state);
  }

  /** 带 TTL 保存:用于人机练习等临时房,避免被遗弃的房间长期占用 Redis */
  async saveEphemeral(roomId: string, state: GameState, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.key(roomId), state, { ex: ttlSeconds });
  }
}

/** PveRecordStore 的 Redis(Upstash)实现:键 `pve:{roomId}`,带 TTL */
export class RedisPveRecordStore implements PveRecordStore {
  constructor(private readonly redis: Redis) {}

  private key(roomId: string): string {
    return `pve:${roomId}`;
  }

  async load(roomId: string): Promise<PveRecord | null> {
    return (await this.redis.get<PveRecord>(this.key(roomId))) ?? null;
  }

  async save(roomId: string, record: PveRecord, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.key(roomId), record, { ex: ttlSeconds });
  }
}
