import type { Redis } from '@upstash/redis';
import type { GameState } from '@bullfighting/game';
import type { GameStateStore } from './gamePorts';

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
}
