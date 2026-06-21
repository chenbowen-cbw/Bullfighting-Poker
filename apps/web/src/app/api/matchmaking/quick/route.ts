import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getMatchmakingService } from '@/lib/rooms';
import { quickMatchSchema } from '@/lib/validation';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { baseScore } = quickMatchSchema.parse(body);
    const result = await getMatchmakingService().quickMatch(user.id, baseScore);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
