import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getRoomService } from '@/lib/rooms';
import { joinRoomSchema } from '@/lib/validation';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { chipsIn } = joinRoomSchema.parse(body);
    const result = await getRoomService().join(id, user.id, chipsIn);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
