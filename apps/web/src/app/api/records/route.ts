import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getStatsRepository } from '@/lib/statsRepository';
import { recordsQuerySchema } from '@/lib/validation';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/records?limit&offset —— 当前用户最近的战绩(round_players + round 概要) */
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const { limit, offset } = recordsQuerySchema.parse({
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });
    const records = await getStatsRepository(getDb()).listRecords(Number(user.id), limit, offset);
    return NextResponse.json({ records, limit, offset });
  } catch (err) {
    return errorResponse(err);
  }
}
