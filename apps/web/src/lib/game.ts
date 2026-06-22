import { Rest } from 'ably';
import { Client } from '@upstash/qstash';
import { Redis } from '@upstash/redis';
import { GameService } from './gameService';
import { RedisGameStateStore, RedisPveRecordStore } from './gameStateStore';
import { AblyGamePublisher } from './gamePublisher';
import { QStashGameScheduler } from './gameScheduler';
import { DrizzleGameSettlement } from './gameSettlement';
import { requireEnv } from './env';
import type { GameScheduler, GameSettlementSink } from './gamePorts';

export { GameService } from './gameService';

/**
 * 惰性 QStash 调度器:仅 PvP 的超时自动推进会用到 QStash。
 * 把 APP_URL / QSTASH_TOKEN 的校验推迟到首次真正调度时——
 * 这样人机练习(PvE,纯 Redis + Ably,从不调度)等路径,
 * 不会因为缺这两个 PvP 专属变量而连服务都构造不出来(那会导致 500)。
 */
function lazyScheduler(): GameScheduler {
  let inner: QStashGameScheduler | undefined;
  const resolve = (): QStashGameScheduler => {
    if (!inner) {
      const callbackUrl = `${requireEnv('APP_URL')}/api/internal/qstash/advance`;
      inner = new QStashGameScheduler(
        new Client({ token: requireEnv('QSTASH_TOKEN') }),
        callbackUrl,
      );
    }
    return inner;
  };
  return { schedule: (roomId, deadline) => resolve().schedule(roomId, deadline) };
}

/**
 * 惰性结算落库:仅 PvP 结算会写 Postgres。
 * 人机练习从不结算落库,故把 DATABASE_URL 的校验推迟到首次结算时。
 */
function lazySettlement(): GameSettlementSink {
  let inner: DrizzleGameSettlement | undefined;
  const resolve = (): DrizzleGameSettlement => {
    if (!inner) inner = new DrizzleGameSettlement(requireEnv('DATABASE_URL'));
    return inner;
  };
  return { apply: (ctx) => resolve().apply(ctx) };
}

let cached: GameService | undefined;

/**
 * 惰性装配对局服务。
 *
 * - Redis(状态 / 练习记录)与 Ably(广播)为所有路径(含 PvE)所必需,即时校验。
 * - QStash(定时)与结算落库(Postgres)仅 PvP 用到,延迟到首次使用再校验对应变量,
 *   使人机练习不因 PvP 专属变量(QSTASH_TOKEN / APP_URL / DATABASE_URL)缺失而失败。
 * - 缺任何必需变量时抛 ConfigError(503),响应会直接显示缺少的变量名。
 */
export function getGameService(): GameService {
  if (!cached) {
    const redis = new Redis({
      url: requireEnv('UPSTASH_REDIS_REST_URL'),
      token: requireEnv('UPSTASH_REDIS_REST_TOKEN'),
    });
    cached = new GameService(
      new RedisGameStateStore(redis),
      new AblyGamePublisher(new Rest(requireEnv('ABLY_API_KEY'))),
      lazyScheduler(),
      lazySettlement(),
      new RedisPveRecordStore(redis),
    );
  }
  return cached;
}
