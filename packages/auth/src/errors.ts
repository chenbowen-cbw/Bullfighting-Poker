export type AuthErrorCode =
  | 'INVALID_INPUT'
  | 'USERNAME_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'UNAUTHORIZED';

/** 认证领域错误,携带稳定的错误码与建议 HTTP 状态 */
export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly status: number;

  constructor(code: AuthErrorCode, message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
  }

  static invalidInput(message = '输入不合法'): AuthError {
    return new AuthError('INVALID_INPUT', message, 400);
  }
  static usernameTaken(message = '用户名已被占用'): AuthError {
    return new AuthError('USERNAME_TAKEN', message, 409);
  }
  static invalidCredentials(message = '用户名或密码错误'): AuthError {
    return new AuthError('INVALID_CREDENTIALS', message, 401);
  }
  static userNotFound(message = '用户不存在'): AuthError {
    return new AuthError('USER_NOT_FOUND', message, 404);
  }
  static unauthorized(message = '未认证或令牌无效'): AuthError {
    return new AuthError('UNAUTHORIZED', message, 401);
  }
}
