import type { GameState, SettlementDelta } from '@bullfighting/game';

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

/** 结算落账(数据库) */
export interface GameSettlementSink {
  apply(roomId: string, roundNo: number, deltas: SettlementDelta[]): Promise<void>;
}
