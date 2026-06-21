import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getStatsRepository } from '@/lib/statsRepository';
import { idParamSchema } from '@/lib/validation';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/users/[id]/stats —— 某用户的个人统计(不存在则零值) */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    await requireUser(req);
    const { id } = await params;
    const userId = idParamSchema.parse(id);
    const stats = await getStatsRepository(getDb()).getUserStats(userId);
    return NextResponse.json({ stats });
  } catch (err) {
    return errorResponse(err);
  }
}
