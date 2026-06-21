/** 数据层中的用户记录(含密码哈希,绝不外发) */
export interface AuthUserRecord {
  id: string;
  username: string;
  passwordHash: string;
  nickname: string;
  chips: number;
  status: string;
}

/** 对外的公开用户信息(不含敏感字段) */
export interface PublicUser {
  id: string;
  username: string;
  nickname: string;
  chips: number;
  status: string;
}

/** 创建用户的输入 */
export interface CreateUserInput {
  username: string;
  passwordHash: string;
  nickname: string;
  chips: number;
}

/** JWT 载荷 */
export interface JwtClaims {
  sub: string;
  username: string;
}

/** 认证结果(注册/登录) */
export interface AuthResult {
  user: PublicUser;
  token: string;
}

/** 把数据记录转为公开信息 */
export function toPublicUser(u: AuthUserRecord): PublicUser {
  return {
    id: u.id,
    username: u.username,
    nickname: u.nickname,
    chips: u.chips,
    status: u.status,
  };
}
