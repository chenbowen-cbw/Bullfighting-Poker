import { NextResponse } from 'next/server';
import { RoomError } from '@bullfighting/rooms';
import { requireUser } from '@/lib/auth';
import { getRoomService } from '@/lib/rooms';
import { getGameService } from '@/lib/game';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    const { roomId } = await params;
    const { room, seats } = await getRoomService().getRoom(roomId);
    if (!seats.some((s) => s.userId === user.id)) throw RoomError.notSeated();

    const seatInputs = seats.map((s) => ({ seatId: s.userId, seatNo: s.seatNo }));
    const view = await getGameService().startRound(roomId, seatInputs, room.baseScore, user.id);
    // 开局后把房间标记为进行中,阻止他人从大厅中途入座造成花名册不一致
    await getRoomService().markPlaying(roomId);
    return NextResponse.json(view, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
