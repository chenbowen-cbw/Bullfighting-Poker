import type { GameState } from '@bullfighting/game';
import type { RoundSettlementContext } from '@bullfighting/stats';

/** 对局状态存储(Redis) */
export interface GameStateStore {
  load(roomId: string): Promise<GameState | null>;
  save(roomId: string, state: GameState): Promise<void>;
  /**
   * 带 TTL 的临时状态保存(用于人机练习等不入库的临时房,过期自动清理)。
   * 可选:不提供时人机练习路径会退化为普通 save(不影响 PvP)。
   */
  saveEphemeral?(roomId: string, state: GameState, ttlSeconds: number): Promise<void>;
}

/** 人机练习(PvE)的小型 Redis 记录:仅存难度等元信息,不入库 */
export interface PveRecord {
  difficulty: 'easy' | 'medium' | 'hard';
  createdBy: string;
  baseScore: number;
  botCount: number;
}

/** 人机练习元信息存储(Redis,带 TTL) */
export interface PveRecordStore {
  load(roomId: string): Promise<PveRecord | null>;
  save(roomId: string, record: PveRecord, ttlSeconds: number): Promise<void>;
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
