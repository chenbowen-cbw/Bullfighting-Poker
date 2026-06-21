export type GameErrorCode =
  | 'WRONG_PHASE'
  | 'NOT_IN_GAME'
  | 'ALREADY_ACTED'
  | 'INVALID_MULTIPLIER'
  | 'NOT_ENOUGH_PLAYERS'
  | 'BANKER_CANNOT_BET'
  | 'INVALID_STATE';

/** 对局领域错误,携带稳定错误码与建议 HTTP 状态 */
export class GameError extends Error {
  readonly code: GameErrorCode;
  readonly status: number;

  constructor(code: GameErrorCode, message: string, status: number) {
    super(message);
    this.name = 'GameError';
    this.code = code;
    this.status = status;
  }

  static wrongPhase(message = '当前阶段不允许该操作'): GameError {
    return new GameError('WRONG_PHASE', message, 409);
  }
  static notInGame(message = '你不在本局对局中'): GameError {
    return new GameError('NOT_IN_GAME', message, 403);
  }
  static alreadyActed(message = '你已操作过'): GameError {
    return new GameError('ALREADY_ACTED', message, 409);
  }
  static invalidMultiplier(message = '倍数不合法'): GameError {
    return new GameError('INVALID_MULTIPLIER', message, 400);
  }
  static notEnoughPlayers(message = '人数不足,无法开局'): GameError {
    return new GameError('NOT_ENOUGH_PLAYERS', message, 409);
  }
  static bankerCannotBet(message = '庄家无需下注'): GameError {
    return new GameError('BANKER_CANNOT_BET', message, 409);
  }
  static invalidState(message = '对局状态异常'): GameError {
    return new GameError('INVALID_STATE', message, 500);
  }
}
