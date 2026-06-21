import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getStatsRepository } from '@/lib/statsRepository';
import { leaderboardQuerySchema } from '@/lib/validation';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/leaderboard?metric=chips|netWin&limit —— 排行榜 */
export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireUser(req);
    const { searchParams } = new URL(req.url);
    const { metric, limit } = leaderboardQuerySchema.parse({
      metric: searchParams.get('metric') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });
    const entries = await getStatsRepository(getDb()).leaderboard(metric, limit);
    return NextResponse.json({ metric, entries });
  } catch (err) {
    return errorResponse(err);
  }
}
