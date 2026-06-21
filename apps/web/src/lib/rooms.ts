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
    // 容错:空串/非法值(Number('')===0)回退默认 4,避免 matchSize=0 立即"匹配"出非法房间
    const parsedMatchSize = Number(process.env.MATCH_SIZE);
    const matchSize =
      Number.isInteger(parsedMatchSize) && parsedMatchSize >= 2 ? parsedMatchSize : 4;
    matchmakingService = new MatchmakingService(
      new RedisMatchmakingQueue(redis),
      getRoomService(),
      { matchSize },
    );
  }
  return matchmakingService;
}
