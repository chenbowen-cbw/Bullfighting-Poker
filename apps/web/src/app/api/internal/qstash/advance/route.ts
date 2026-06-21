import { NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { getGameService } from '@/lib/game';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** QStash 延时回调:校验签名后推进对局(回合超时托管) */
export async function POST(req: Request): Promise<NextResponse> {
  const body = await req.text();
  const signature = req.headers.get('upstash-signature') ?? '';

  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? '',
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? '',
  });

  try {
    const valid = await receiver.verify({ signature, body });
    if (!valid) return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  try {
    const { roomId, deadline } = JSON.parse(body) as { roomId: string; deadline: number };
    await getGameService().handleTimeout(roomId, deadline);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('QStash advance 处理失败:', err);
    return NextResponse.json({ error: '处理失败' }, { status: 500 });
  }
}
