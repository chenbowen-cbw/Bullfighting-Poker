import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getRoomService } from '@/lib/rooms';
import { createRoomSchema } from '@/lib/validation';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { buyIn, ...config } = createRoomSchema.parse(body);
    const result = await getRoomService().createRoom(user.id, config, buyIn);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireUser(req);
    const { searchParams } = new URL(req.url);
    const baseScoreRaw = searchParams.get('baseScore');
    const list = await getRoomService().listOpen({
      baseScore: baseScoreRaw ? Number(baseScoreRaw) : undefined,
      limit: Number(searchParams.get('limit') ?? 20),
      offset: Number(searchParams.get('offset') ?? 0),
    });
    return NextResponse.json({ rooms: list });
  } catch (err) {
    return errorResponse(err);
  }
}
