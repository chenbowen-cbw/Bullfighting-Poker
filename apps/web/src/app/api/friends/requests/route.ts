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
      // 新建请求:发起方=我,通知收件人(规范化对中的另一方)收到好友申请
      const recipientId =
        request.initiatorId === request.requesterId ? request.addresseeId : request.requesterId;
      await userNotifier.notifyFriendRequest(recipientId, user);
    } else {
      // 自动接受(对方此前已向我发出请求):通知原发起人(initiatorId)你们已成好友
      await userNotifier.notifyFriendAccepted(request.initiatorId, user);
    }
    return NextResponse.json({ request }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
