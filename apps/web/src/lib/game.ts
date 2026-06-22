import { Rest } from 'ably';
import { Client } from '@upstash/qstash';
import { Redis } from '@upstash/redis';
import { GameService } from './gameService';
import { RedisGameStateStore, RedisPveRecordStore } from './gameStateStore';
import { AblyGamePublisher } from './gamePublisher';
import { QStashGameScheduler } from './gameScheduler';
import { DrizzleGameSettlement } from './gameSettlement';

export { GameService } from './gameService';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 未配置`);
  return value;
}

let cached: GameService | undefined;

/** 惰性装配对局服务(Redis 状态 + Ably 广播 + QStash 定时 + 事务化结算落库 + 人机练习元信息) */
export function getGameService(): GameService {
  if (!cached) {
    const callbackUrl = `${requireEnv('APP_URL')}/api/internal/qstash/advance`;
    const redis = Redis.fromEnv();
    cached = new GameService(
      new RedisGameStateStore(redis),
      new AblyGamePublisher(new Rest(requireEnv('ABLY_API_KEY'))),
      new QStashGameScheduler(new Client({ token: requireEnv('QSTASH_TOKEN') }), callbackUrl),
      new DrizzleGameSettlement(requireEnv('DATABASE_URL')),
      new RedisPveRecordStore(redis),
    );
  }
  return cached;
}
