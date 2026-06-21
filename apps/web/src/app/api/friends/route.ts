import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getFriendsService } from '@/lib/friends';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 列出我的好友(已成为好友) */
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    const friends = await getFriendsService().listFriends(user.id);
    return NextResponse.json({ friends });
  } catch (err) {
    return errorResponse(err);
  }
}
