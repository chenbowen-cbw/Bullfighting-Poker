import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthError } from '@bullfighting/auth';
import { RoomError } from '@bullfighting/rooms';
import { GameError } from '@bullfighting/game';
import { FriendsError } from '@bullfighting/friends';
import { ConfigError } from './env';

/** 统一把领域错误映射为 HTTP 响应 */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json({ error: '输入不合法', issues: err.issues }, { status: 400 });
  }
  if (
    err instanceof AuthError ||
    err instanceof RoomError ||
    err instanceof GameError ||
    err instanceof FriendsError
  ) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  // 配置缺失:回显具体变量名(非敏感),便于线上自检,而非吞成无信息的 500。
  if (err instanceof ConfigError) {
    console.error('配置错误:', err.message);
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  console.error('未处理的服务器错误:', err);
  return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
}
