import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthError } from '@bullfighting/auth';
import { RoomError } from '@bullfighting/rooms';

/** 统一把领域错误映射为 HTTP 响应 */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json({ error: '输入不合法', issues: err.issues }, { status: 400 });
  }
  if (err instanceof AuthError || err instanceof RoomError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  console.error('未处理的服务器错误:', err);
  return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
}
