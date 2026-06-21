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
