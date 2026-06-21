import type { GameState } from '@bullfighting/game';
import type { RoundSettlementContext } from '@bullfighting/stats';

/** 对局状态存储(Redis) */
export interface GameStateStore {
  load(roomId: string): Promise<GameState | null>;
  save(roomId: string, state: GameState): Promise<void>;
}

/** 对局状态广播(Ably) */
export interface GamePublisher {
  broadcast(state: GameState): Promise<void>;
}

/** 回合定时调度(QStash) */
export interface GameScheduler {
  schedule(roomId: string, deadline: number): Promise<void>;
}

/**
 * 结算落库端口。实现应在**单个数据库事务**内原子完成:
 * 各 users.chips 增减、transactions 账本、rounds、round_players、user_stats 累加。
 */
export interface GameSettlementSink {
  apply(ctx: RoundSettlementContext): Promise<{ roundId: string }>;
}
