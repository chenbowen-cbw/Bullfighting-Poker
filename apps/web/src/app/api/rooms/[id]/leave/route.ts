import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getRoomService } from '@/lib/rooms';
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
    const result = await getRoomService().leave(id, user.id);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
