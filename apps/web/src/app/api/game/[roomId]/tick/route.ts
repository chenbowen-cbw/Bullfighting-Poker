import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getGameService } from '@/lib/game';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 客户端超时兜底:当本阶段截止时间已过、却迟迟未被 QStash 定时推进时,
 * 由前端调用本端点推进一次 TIMEOUT。仅参与者可触发,且仅当确已到期才推进。
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    const { roomId } = await params;
    const view = await getGameService().tickIfExpired(roomId, user.id);
    if (!view) return NextResponse.json({ error: '对局尚未开始' }, { status: 404 });
    return NextResponse.json(view);
  } catch (err) {
    return errorResponse(err);
  }
}
