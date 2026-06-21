import { FriendsService } from '@bullfighting/friends';
import { getDb } from './db';
import { DrizzleFriendsRepository } from './friendsRepository';

let friendsService: FriendsService | undefined;

/** 惰性构造好友服务(注入 Drizzle 好友仓储) */
export function getFriendsService(): FriendsService {
  if (!friendsService) {
    friendsService = new FriendsService(new DrizzleFriendsRepository(getDb()));
  }
  return friendsService;
}
