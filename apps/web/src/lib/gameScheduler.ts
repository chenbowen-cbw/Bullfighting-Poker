import type { Client } from '@upstash/qstash';
import type { GameScheduler } from './gamePorts';

/**
 * GameScheduler 的 QStash 实现。
 * 在 deadline 到达时回调内部接口推进对局(回合超时托管)。
 */
export class QStashGameScheduler implements GameScheduler {
  constructor(
    private readonly qstash: Client,
    private readonly callbackUrl: string,
  ) {}

  async schedule(roomId: string, deadline: number): Promise<void> {
    const delay = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    await this.qstash.publishJSON({
      url: this.callbackUrl,
      body: { roomId, deadline },
      delay,
    });
  }
}
