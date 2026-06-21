import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getFriendsService } from '@/lib/friends';
import { getRoomService } from '@/lib/rooms';
import { userNotifier } from '@/lib/userNotifier';
import { inviteFriendSchema } from '@/lib/validation';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 邀请好友进入我所在的房间 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ friendId: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    const { friendId } = await params;
    const body = await req.json();
    const { roomId } = inviteFriendSchema.parse(body);

    // 必须是好友才能邀请(否则 NOT_FRIENDS)
    await getFriendsService().requireFriends(user.id, friendId);

    // 加载房间以拿到房间码/名称;不存在则抛 ROOM_NOT_FOUND(404)
    const { room } = await getRoomService().getRoom(roomId);

    await userNotifier.notifyGameInvite(friendId, {
      roomId: room.id,
      roomCode: room.roomCode,
      fromUser: { id: user.id, nickname: user.nickname },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
