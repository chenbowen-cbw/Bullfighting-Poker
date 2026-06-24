import type { Redis } from '@upstash/redis';
import type { MatchmakingQueue, MatchedRegistry } from '@bullfighting/rooms';

/** 整条匹配队列键的存活上限:30 分钟无活动则自动过期,清理被整体遗弃的队列(僵尸键)。 */
const QUEUE_TTL_SECONDS = 30 * 60;
/** 匹配指针存活上限:被匹配者需在此时间内轮询/收到推送以发现房间。 */
const MATCHED_TTL_SECONDS = 5 * 60;

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
    // 刷新整条队列键 TTL:被整体遗弃的队列自动过期,避免僵尸键长期滞留。
    await this.redis.expire(this.setKey(baseScore), QUEUE_TTL_SECONDS);
    await this.redis.expire(this.listKey(baseScore), QUEUE_TTL_SECONDS);
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

/** MatchedRegistry 的 Redis(Upstash)实现:键 `mm:matched:{userId}`,带 TTL。 */
export class RedisMatchedRegistry implements MatchedRegistry {
  constructor(private readonly redis: Redis) {}

  private key(userId: string): string {
    return `mm:matched:${userId}`;
  }

  async markMatched(userIds: string[], roomId: string): Promise<void> {
    await Promise.all(
      userIds.map((id) => this.redis.set(this.key(id), roomId, { ex: MATCHED_TTL_SECONDS })),
    );
  }

  async takeMatch(userId: string): Promise<string | null> {
    return (await this.redis.getdel<string>(this.key(userId))) ?? null;
  }
}
