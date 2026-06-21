import { NextResponse } from 'next/server';
import { AuthError } from '@bullfighting/auth';
import { getAuthService, getBearerToken } from '@/lib/auth';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const token = getBearerToken(req);
    if (!token) throw AuthError.unauthorized();
    const user = await getAuthService().authenticate(token);
    return NextResponse.json({ user });
  } catch (err) {
    return errorResponse(err);
  }
}
