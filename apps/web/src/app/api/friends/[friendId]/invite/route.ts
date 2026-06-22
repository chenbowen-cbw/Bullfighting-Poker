import { NextResponse } from 'next/server';
import { RoomError } from '@bullfighting/rooms';
import { requireUser } from '@/lib/auth';
import { getFriendsService } from '@/lib/friends';
import { getRoomService } from '@/lib/rooms';
import { userNotifier } from '@/lib/userNotifier';
import { idParamSchema, inviteFriendSchema } from '@/lib/validation';
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
    const { friendId: rawFriendId } = await params;
    // 校验路径参数(正整数),避免 NaN 绑定进入服务层
    const friendId = String(idParamSchema.parse(rawFriendId));
    const body = await req.json();
    const { roomId } = inviteFriendSchema.parse(body);

    // 必须是好友才能邀请(否则 NOT_FRIENDS)
    await getFriendsService().requireFriends(user.id, friendId);

    // 加载房间以拿到房间码/名称;不存在则抛 ROOM_NOT_FOUND(404)
    const { room, seats } = await getRoomService().getRoom(roomId);

    // 只有在座玩家才能邀请他人进房(防止把好友拉进自己都不在的房间)
    if (!seats.some((s) => s.userId === user.id)) throw RoomError.notFound();

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
