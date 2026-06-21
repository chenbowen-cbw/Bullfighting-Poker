import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getRoomService } from '@/lib/rooms';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    await requireUser(req);
    const { id } = await params;
    const result = await getRoomService().getRoom(id);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
