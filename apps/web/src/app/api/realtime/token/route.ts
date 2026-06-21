import { NextResponse } from 'next/server';
import { Rest } from 'ably';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * roomId 校验:PvP 为正整数字符串,PvE 为 `pve:` 前缀。
 * 仅用于把能力收窄到该房间,非法值直接 400。
 */
const roomIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^(pve:[\w-]+|\d+)$/, 'roomId 不合法');

/**
 * 为已登录用户签发 Ably token,供浏览器订阅频道。
 *
 * 能力(capability)按需收窄,绝不下发通配符:
 * - 始终授予 `user:{user.id}` 的 subscribe(本人通知频道,useFriendNotifications 用);
 * - 若带 ?roomId,则额外授予 `room:{roomId}` 与 `room:{roomId}:player:{user.id}` 的
 *   subscribe(对局公共频道 + 本人私有手牌频道,useRealtime 用)。
 *
 * 这样任一登录用户都无法订阅他人的 `room:{x}:player:{y}` 私有手牌频道或 `user:{victim}`
 * 通知频道。频道命名与 gamePublisher.ts / userNotifier.ts 严格一致。
 */
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) throw new Error('ABLY_API_KEY 未配置');

    const rawRoomId = new URL(req.url).searchParams.get('roomId');
    const roomId = rawRoomId ? roomIdSchema.parse(rawRoomId) : null;

    // 始终授予本人通知频道;有房间时再加房间公共频道与本人私有手牌频道。
    const capability: Record<string, ['subscribe']> = {
      [`user:${user.id}`]: ['subscribe'],
    };
    if (roomId) {
      capability[`room:${roomId}`] = ['subscribe'];
      capability[`room:${roomId}:player:${user.id}`] = ['subscribe'];
    }

    const ably = new Rest(apiKey);
    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: user.id,
      capability: JSON.stringify(capability),
    });
    return NextResponse.json(tokenRequest);
  } catch (err) {
    return errorResponse(err);
  }
}
