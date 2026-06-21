import { Redis } from '@upstash/redis';
import { MatchmakingService, RoomService } from '@bullfighting/rooms';
import { getDb } from './db';
import { DrizzleRoomRepository } from './roomRepository';
import { RedisMatchmakingQueue } from './matchmakingQueue';

let roomService: RoomService | undefined;

/** 惰性构造房间服务(注入 Drizzle 房间仓储) */
export function getRoomService(): RoomService {
  if (!roomService) {
    roomService = new RoomService(new DrizzleRoomRepository(getDb()));
  }
  return roomService;
}

let matchmakingService: MatchmakingService | undefined;

/** 惰性构造匹配服务(注入 Upstash Redis 队列与房间服务) */
export function getMatchmakingService(): MatchmakingService {
  if (!matchmakingService) {
    const redis = Redis.fromEnv();
    const matchSize = Number(process.env.MATCH_SIZE ?? 4);
    matchmakingService = new MatchmakingService(
      new RedisMatchmakingQueue(redis),
      getRoomService(),
      { matchSize },
    );
  }
  return matchmakingService;
}
