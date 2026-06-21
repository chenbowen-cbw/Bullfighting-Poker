/** 好友关系状态:pending=请求待处理,accepted=已成为好友 */
export type FriendStatus = 'pending' | 'accepted';

/** 好友关系记录(对应一条 friendships) */
export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendStatus;
}

/** 对外公开的好友信息(不含敏感字段) */
export interface PublicFriend {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
  chips: number;
  status: string;
}

/**
 * 好友请求(用于待处理列表):
 * - id 为 friendship 记录 id;
 * - direction 标记当前用户视角(incoming=别人请求我,outgoing=我请求别人);
 * - user 为"对方"的公开资料。
 */
export interface FriendRequest {
  id: string;
  direction: 'incoming' | 'outgoing';
  user: PublicFriend;
}
