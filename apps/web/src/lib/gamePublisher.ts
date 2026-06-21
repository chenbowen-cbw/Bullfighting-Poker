import type { Rest } from 'ably';
import { projectState, type GameState } from '@bullfighting/game';
import type { GamePublisher } from './gamePorts';

/**
 * GamePublisher 的 Ably 实现。
 * 房间频道广播公开状态(隐藏未亮牌的手牌);各玩家私有频道单播其自身手牌。
 */
export class AblyGamePublisher implements GamePublisher {
  constructor(private readonly ably: Rest) {}

  async broadcast(state: GameState): Promise<void> {
    const roomChannel = this.ably.channels.get(`room:${state.roomId}`);
    await roomChannel.publish('game:state', projectState(state));

    await Promise.all(
      state.players.map((p) =>
        this.ably.channels
          .get(`room:${state.roomId}:player:${p.seatId}`)
          .publish('game:state', projectState(state, p.seatId)),
      ),
    );
  }
}
