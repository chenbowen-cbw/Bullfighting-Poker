import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getFriendsService } from '@/lib/friends';
import { userNotifier } from '@/lib/userNotifier';
import { idParamSchema } from '@/lib/validation';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 接受一条好友请求 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    const { id: rawId } = await params;
    const id = String(idParamSchema.parse(rawId));
    const friendship = await getFriendsService().acceptRequest(user.id, id);
    // 通知原发起人(initiatorId):你的好友请求被接受
    await userNotifier.notifyFriendAccepted(friendship.initiatorId, user);
    return NextResponse.json({ friendship });
  } catch (err) {
    return errorResponse(err);
  }
}
