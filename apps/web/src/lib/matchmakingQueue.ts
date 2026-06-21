import type { Redis } from '@upstash/redis';
import type { MatchmakingQueue } from '@bullfighting/rooms';

/** 原子地取出恰好 size 个排队者(LLEN 校验 + 连续 LPOP + SREM),不足返回空表 */
const POP_GROUP_LUA = `
local listKey = KEYS[1]
local setKey = KEYS[2]
local size = tonumber(ARGV[1])
if redis.call('LLEN', listKey) < size then return {} end
local result = {}
for i = 1, size do
  local v = redis.call('LPOP', listKey)
  redis.call('SREM', setKey, v)
  table.insert(result, v)
end
return result
`;

/** MatchmakingQueue 的 Redis(Upstash)实现 */
export class RedisMatchmakingQueue implements MatchmakingQueue {
  constructor(private readonly redis: Redis) {}

  private listKey(baseScore: number): string {
    return `mm:queue:${baseScore}`;
  }

  private setKey(baseScore: number): string {
    return `mm:members:${baseScore}`;
  }

  async enqueue(baseScore: number, userId: string): Promise<void> {
    const added = await this.redis.sadd(this.setKey(baseScore), userId);
    if (added) await this.redis.rpush(this.listKey(baseScore), userId);
  }

  async isQueued(baseScore: number, userId: string): Promise<boolean> {
    return (await this.redis.sismember(this.setKey(baseScore), userId)) === 1;
  }

  async remove(baseScore: number, userId: string): Promise<void> {
    await this.redis.srem(this.setKey(baseScore), userId);
    await this.redis.lrem(this.listKey(baseScore), 0, userId);
  }

  async popGroup(baseScore: number, size: number): Promise<string[] | null> {
    const result = (await this.redis.eval(
      POP_GROUP_LUA,
      [this.listKey(baseScore), this.setKey(baseScore)],
      [size],
    )) as string[];
    return Array.isArray(result) && result.length === size ? result : null;
  }
}
