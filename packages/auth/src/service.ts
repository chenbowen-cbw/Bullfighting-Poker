import type { UserRepository } from './repository';
import type { AuthResult, PublicUser } from './types';
import { toPublicUser } from './types';
import { hashPassword, verifyPassword } from './password';
import { signAccessToken, verifyToken } from './jwt';
import { AuthError } from './errors';

export interface AuthServiceConfig {
  jwtSecret: string;
  /** 访问令牌有效期,jose 时长写法,默认 '2h' */
  accessTokenTtl?: string;
  /** 新用户初始筹码,默认 10000 */
  initialChips?: number;
}

const USERNAME_RE = /^[A-Za-z0-9_]{3,32}$/;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 128;

export interface RegisterInput {
  username: string;
  password: string;
  nickname?: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

/** 认证服务。依赖注入 UserRepository,与具体存储解耦,可用内存实现单测。 */
export class AuthService {
  private readonly repo: UserRepository;
  private readonly jwtSecret: string;
  private readonly accessTokenTtl: string;
  private readonly initialChips: number;

  constructor(repo: UserRepository, config: AuthServiceConfig) {
    if (!config.jwtSecret) throw new Error('AuthService 需要 jwtSecret');
    this.repo = repo;
    this.jwtSecret = config.jwtSecret;
    this.accessTokenTtl = config.accessTokenTtl ?? '2h';
    this.initialChips = config.initialChips ?? 10000;
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const username = input.username?.trim() ?? '';
    if (!USERNAME_RE.test(username)) {
      throw AuthError.invalidInput('用户名需为 3-32 位字母、数字或下划线');
    }
    if (
      typeof input.password !== 'string' ||
      input.password.length < PASSWORD_MIN ||
      input.password.length > PASSWORD_MAX
    ) {
      throw AuthError.invalidInput(`密码长度需为 ${PASSWORD_MIN}-${PASSWORD_MAX} 位`);
    }

    const existing = await this.repo.findByUsername(username);
    if (existing) throw AuthError.usernameTaken();

    const passwordHash = await hashPassword(input.password);
    const nickname = input.nickname?.trim() || username;
    const user = await this.repo.create({
      username,
      passwordHash,
      nickname,
      chips: this.initialChips,
    });

    return this.toAuthResult(user.id, user.username, toPublicUser(user));
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const username = input.username?.trim() ?? '';
    const user = await this.repo.findByUsername(username);
    if (!user) throw AuthError.invalidCredentials();

    const ok = await verifyPassword(input.password ?? '', user.passwordHash);
    if (!ok) throw AuthError.invalidCredentials();

    return this.toAuthResult(user.id, user.username, toPublicUser(user));
  }

  async getById(id: string): Promise<PublicUser> {
    const user = await this.repo.findById(id);
    if (!user) throw AuthError.userNotFound();
    return toPublicUser(user);
  }

  /** 校验令牌并返回当前用户(供 /me 等受保护接口使用) */
  async authenticate(token: string): Promise<PublicUser> {
    const claims = await verifyToken(token, this.jwtSecret);
    return this.getById(claims.sub);
  }

  private async toAuthResult(sub: string, username: string, user: PublicUser): Promise<AuthResult> {
    const token = await signAccessToken({ sub, username }, this.jwtSecret, this.accessTokenTtl);
    return { user, token };
  }
}
