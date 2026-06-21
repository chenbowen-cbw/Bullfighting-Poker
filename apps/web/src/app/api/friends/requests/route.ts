import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getFriendsService } from '@/lib/friends';
import { userNotifier } from '@/lib/userNotifier';
import { sendFriendRequestSchema } from '@/lib/validation';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 待处理的好友请求:{ incoming, outgoing } */
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    const result = await getFriendsService().listRequests(user.id);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}

/** 发起好友请求(按用户名) */
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { toUsername } = sendFriendRequestSchema.parse(body);
    const request = await getFriendsService().sendRequest(user.id, toUsername);
    if (request.status === 'pending') {
      // 新建请求:通知收件人收到好友申请
      await userNotifier.notifyFriendRequest(request.addresseeId, user);
    } else {
      // 自动接受(对方此前已向我发出请求):通知原发起人你们已成好友
      await userNotifier.notifyFriendAccepted(request.requesterId, user);
    }
    return NextResponse.json({ request }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
