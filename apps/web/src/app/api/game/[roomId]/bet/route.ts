import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getGameService } from '@/lib/game';
import { betSchema } from '@/lib/validation';
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
    const { multiplier } = betSchema.parse(await req.json());
    const view = await getGameService().act(
      roomId,
      { type: 'BET', seatId: user.id, multiplier, now: Date.now() },
      user.id,
    );
    return NextResponse.json(view);
  } catch (err) {
    return errorResponse(err);
  }
}
