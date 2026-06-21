export type RoomErrorCode =
  | 'INVALID_CONFIG'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ROOM_NOT_JOINABLE'
  | 'ALREADY_SEATED'
  | 'NOT_SEATED'
  | 'INSUFFICIENT_CHIPS'
  | 'ROOM_CODE_EXHAUSTED';

/** 大厅领域错误,携带稳定错误码与建议 HTTP 状态 */
export class RoomError extends Error {
  readonly code: RoomErrorCode;
  readonly status: number;

  constructor(code: RoomErrorCode, message: string, status: number) {
    super(message);
    this.name = 'RoomError';
    this.code = code;
    this.status = status;
  }

  static invalidConfig(message = '房间配置不合法'): RoomError {
    return new RoomError('INVALID_CONFIG', message, 400);
  }
  static notFound(message = '房间不存在'): RoomError {
    return new RoomError('ROOM_NOT_FOUND', message, 404);
  }
  static full(message = '房间已满'): RoomError {
    return new RoomError('ROOM_FULL', message, 409);
  }
  static notJoinable(message = '房间当前不可加入'): RoomError {
    return new RoomError('ROOM_NOT_JOINABLE', message, 409);
  }
  static alreadySeated(message = '你已在房间内'): RoomError {
    return new RoomError('ALREADY_SEATED', message, 409);
  }
  static notSeated(message = '你不在该房间内'): RoomError {
    return new RoomError('NOT_SEATED', message, 409);
  }
  static insufficientChips(message = '带入筹码低于房间下限'): RoomError {
    return new RoomError('INSUFFICIENT_CHIPS', message, 400);
  }
  static roomCodeExhausted(message = '房间码生成失败,请重试'): RoomError {
    return new RoomError('ROOM_CODE_EXHAUSTED', message, 500);
  }
}
