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

/** 底分上限(与前端 PveSetupForm 的 clamp 保持一致) */
export const MAX_BASE_SCORE = 1000;

/**
 * 开一局人机练习。
 * 总人数 = 1(人类)+ botCount,需落在 2..10;故 botCount 1..9。
 * baseScore 1..MAX_BASE_SCORE,与前端输入夹取范围一致。
 */
export const startPveSchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']),
  botCount: z.number().int().min(1).max(9),
  baseScore: z.number().int().min(1).max(MAX_BASE_SCORE),
});

/** 发起好友请求:按用户名 */
export const sendFriendRequestSchema = z.object({
  toUsername: z.string().min(1).max(32),
});

/** 邀请好友进入指定房间 */
export const inviteFriendSchema = z.object({
  roomId: z.string().min(1),
});

/** 路径参数中的正整数 id(好友 id / 请求 id 等);返回归一化后的字符串 */
export const idParamSchema = z.coerce.number().int().positive();

/**
 * 路径参数中的 roomId:PvP 为正整数字符串,PvE 为 `pve:` 前缀。
 * 在路由边界校验,避免非法/NaN 值进入服务层与 Postgres 绑定。
 */
export const roomIdParamSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^(pve:[\w-]+|\d+)$/, 'roomId 不合法');

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
