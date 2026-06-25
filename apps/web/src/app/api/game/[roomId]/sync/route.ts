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
    // 房间存在、后端在线,只是本房尚未开局(或读者非本局参与者)——这是正常状态,
    // 用稳定 code 与"接口缺失"的 404 区分开,避免前端误判为"对局服务未上线"。
    if (!view)
      return NextResponse.json(
        { error: '对局尚未开始', code: 'GAME_NOT_STARTED' },
        { status: 404 },
      );
    return NextResponse.json(view);
  } catch (err) {
    return errorResponse(err);
  }
}
