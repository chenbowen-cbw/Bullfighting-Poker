import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(6).max(128),
  nickname: z.string().max(64).optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1).max(32),
  password: z.string().min(1).max(128),
});

export const createRoomSchema = z.object({
  name: z.string().min(1).max(64),
  baseScore: z.number().int().min(1),
  maxPlayers: z.number().int().min(2).max(10),
  mode: z.literal('rob_banker').default('rob_banker'),
  minChips: z.number().int().min(0).default(0),
  buyIn: z.number().int().min(0).default(0),
});

export const joinRoomSchema = z.object({
  chipsIn: z.number().int().min(0).default(0),
});

export const quickMatchSchema = z.object({
  baseScore: z.number().int().min(1),
});

export const robSchema = z.object({
  multiplier: z.number().int().min(0).max(10),
});

export const betSchema = z.object({
  multiplier: z.number().int().min(1).max(10),
});

/** 发起好友请求:按用户名 */
export const sendFriendRequestSchema = z.object({
  toUsername: z.string().min(1).max(32),
});

/** 邀请好友进入指定房间 */
export const inviteFriendSchema = z.object({
  roomId: z.string().min(1),
});

/** 路径参数中的正整数 id */
export const idParamSchema = z.coerce.number().int().positive();

/** 战绩分页:limit 1..100(默认 20),offset ≥ 0(默认 0) */
export const recordsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/** 排行榜:metric=chips|netWin(默认 chips),limit 1..100(默认 20) */
export const leaderboardQuerySchema = z.object({
  metric: z.enum(['chips', 'netWin']).default('chips'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
