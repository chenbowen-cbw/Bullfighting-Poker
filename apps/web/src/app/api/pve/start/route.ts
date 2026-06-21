import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getGameService } from '@/lib/game';
import { startPveSchema } from '@/lib/validation';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 开一局人机练习(纯 Redis,不入库;机器人服务端驱动) */
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    const { difficulty, botCount, baseScore } = startPveSchema.parse(await req.json());
    const { roomId, state } = await getGameService().startPve(user.id, {
      difficulty,
      botCount,
      baseScore,
    });
    return NextResponse.json({ roomId, state }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
