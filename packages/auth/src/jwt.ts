import { SignJWT, jwtVerify } from 'jose';
import type { JwtClaims } from './types';
import { AuthError } from './errors';

const ALG = 'HS256';

function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/** 签发访问令牌(HS256) */
export async function signAccessToken(
  claims: JwtClaims,
  secret: string,
  expiresIn: string = '2h',
): Promise<string> {
  return new SignJWT({ username: claims.username })
    .setProtectedHeader({ alg: ALG })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encodeSecret(secret));
}

/** 校验令牌,失败抛 AuthError(UNAUTHORIZED) */
export async function verifyToken(token: string, secret: string): Promise<JwtClaims> {
  try {
    const { payload } = await jwtVerify(token, encodeSecret(secret), { algorithms: [ALG] });
    const username = typeof payload.username === 'string' ? payload.username : '';
    if (!payload.sub || !username) {
      throw AuthError.unauthorized('令牌载荷缺失');
    }
    return { sub: payload.sub, username };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw AuthError.unauthorized();
  }
}
