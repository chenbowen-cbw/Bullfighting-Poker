export type FriendsErrorCode =
  | 'CANNOT_FRIEND_SELF'
  | 'USER_NOT_FOUND'
  | 'ALREADY_FRIENDS'
  | 'REQUEST_EXISTS'
  | 'REQUEST_NOT_FOUND'
  | 'NOT_FRIENDS'
  | 'FORBIDDEN';

/** 好友领域错误,携带稳定错误码与建议 HTTP 状态 */
export class FriendsError extends Error {
  readonly code: FriendsErrorCode;
  readonly status: number;

  constructor(code: FriendsErrorCode, message: string, status: number) {
    super(message);
    this.name = 'FriendsError';
    this.code = code;
    this.status = status;
  }

  static cannotFriendSelf(message = '不能添加自己为好友'): FriendsError {
    return new FriendsError('CANNOT_FRIEND_SELF', message, 400);
  }
  static userNotFound(message = '用户不存在'): FriendsError {
    return new FriendsError('USER_NOT_FOUND', message, 404);
  }
  static alreadyFriends(message = '你们已经是好友了'): FriendsError {
    return new FriendsError('ALREADY_FRIENDS', message, 409);
  }
  static requestExists(message = '好友请求已存在'): FriendsError {
    return new FriendsError('REQUEST_EXISTS', message, 409);
  }
  static requestNotFound(message = '好友请求不存在'): FriendsError {
    return new FriendsError('REQUEST_NOT_FOUND', message, 404);
  }
  static notFriends(message = '你们还不是好友'): FriendsError {
    return new FriendsError('NOT_FRIENDS', message, 404);
  }
  static forbidden(message = '无权操作该好友请求'): FriendsError {
    return new FriendsError('FORBIDDEN', message, 403);
  }
}
