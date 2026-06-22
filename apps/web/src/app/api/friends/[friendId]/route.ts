import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getFriendsService } from '@/lib/friends';
import { idParamSchema } from '@/lib/validation';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 删除好友 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ friendId: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    const { friendId: rawFriendId } = await params;
    const friendId = String(idParamSchema.parse(rawFriendId));
    await getFriendsService().removeFriend(user.id, friendId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
