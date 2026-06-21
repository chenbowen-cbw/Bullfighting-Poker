import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getGameService } from '@/lib/game';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    const { roomId } = await params;
    const view = await getGameService().getState(roomId, user.id);
    if (!view) return NextResponse.json({ error: '对局尚未开始' }, { status: 404 });
    return NextResponse.json(view);
  } catch (err) {
    return errorResponse(err);
  }
}
