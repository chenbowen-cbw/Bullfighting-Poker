import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getRoomService } from '@/lib/rooms';
import { getGameService } from '@/lib/game';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    const { id } = await params;
    const result = await getRoomService().leave(id, user.id);
    // 同步处理对局态:把离桌者移出花名册,进行中的回合作废。失败不影响离桌主流程。
    try {
      await getGameService().handlePlayerLeft(id, user.id);
    } catch (e) {
      console.warn('处理离桌对局态失败(忽略):', e);
    }
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
