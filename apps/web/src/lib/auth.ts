import { AuthService } from '@bullfighting/auth';
import { getDb } from './db';
import { DrizzleUserRepository } from './userRepository';

let cached: AuthService | undefined;

/** 惰性构造认证服务(注入 Drizzle 用户仓储与环境配置) */
export function getAuthService(): AuthService {
  if (!cached) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET 未配置');
    cached = new AuthService(new DrizzleUserRepository(getDb()), {
      jwtSecret,
      accessTokenTtl: process.env.JWT_TTL ?? '2h',
      initialChips: Number(process.env.INITIAL_CHIPS ?? 10000),
    });
  }
  return cached;
}

/** 从 Authorization 头提取 Bearer 令牌 */
export function getBearerToken(req: Request): string | null {
  const header = req.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}
