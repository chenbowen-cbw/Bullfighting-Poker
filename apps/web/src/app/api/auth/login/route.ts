import { NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validation';
import { getAuthService } from '@/lib/auth';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json();
    const input = loginSchema.parse(body);
    const result = await getAuthService().login(input);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return errorResponse(err);
  }
}
