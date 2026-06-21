import { NextResponse } from 'next/server';
import { Rest } from 'ably';
import { requireUser } from '@/lib/auth';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 为已登录用户签发 Ably token,供浏览器订阅房间频道 */
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) throw new Error('ABLY_API_KEY 未配置');
    const ably = new Rest(apiKey);
    const tokenRequest = await ably.auth.createTokenRequest({ clientId: user.id });
    return NextResponse.json(tokenRequest);
  } catch (err) {
    return errorResponse(err);
  }
}
