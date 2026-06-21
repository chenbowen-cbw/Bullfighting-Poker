import { NextResponse } from 'next/server';

/**
 * 健康检查端点。
 *
 * - 供 Vercel / 外部探针确认应用已就绪(返回 200 + {status:'ok'})。
 * - 故意不触达数据库 / Redis / Ably 等外部依赖,保持轻量、永不因下游抖动而误报。
 *   如需"深度健康检查",建议另开 /api/health/deep 并独立超时。
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(): NextResponse {
  return NextResponse.json({
    status: 'ok',
    service: 'bullfighting-web',
    time: new Date().toISOString(),
  });
}
