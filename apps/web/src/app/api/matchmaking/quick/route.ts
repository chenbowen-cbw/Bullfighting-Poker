import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getMatchmakingService } from '@/lib/rooms';
import { userNotifier } from '@/lib/userNotifier';
import { quickMatchSchema } from '@/lib/validation';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 加入快速匹配队列;凑齐则建房,并把其余被匹配者通过实时频道推送到(轮询为兜底)。 */
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    const { baseScore } = quickMatchSchema.parse(await req.json());
    const result = await getMatchmakingService().quickMatch(user.id, baseScore);
    if (result.status === 'matched') {
      const { room, seats } = result.room;
      await Promise.all(
        seats
          .filter((s) => s.userId !== user.id)
          .map((s) =>
            userNotifier.notifyMatchFound(s.userId, { roomId: room.id, roomCode: room.roomCode }),
          ),
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}

/** 退出快速匹配队列。 */
export async function DELETE(req: Request): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    const { baseScore } = quickMatchSchema.parse(await req.json());
    await getMatchmakingService().cancel(user.id, baseScore);
    return NextResponse.json({ status: 'cancelled' });
  } catch (err) {
    return errorResponse(err);
  }
}
