import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getGameService } from '@/lib/game';
import { roomIdParamSchema } from '@/lib/validation';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 同一练习房开下一局(仅创建者可操作) */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    const { roomId: rawRoomId } = await params;
    const roomId = roomIdParamSchema.parse(rawRoomId);
    const view = await getGameService().nextPveRound(roomId, user.id);
    return NextResponse.json(view);
  } catch (err) {
    return errorResponse(err);
  }
}
