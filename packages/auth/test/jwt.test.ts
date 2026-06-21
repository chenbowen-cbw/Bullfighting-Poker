import { describe, it, expect } from 'vitest';
import { signAccessToken, verifyToken } from '../src/jwt';
import { AuthError } from '../src/errors';

const SECRET = 'test-secret-key-please-rotate';

describe('jwt', () => {
  it('签发的令牌可被同密钥校验', async () => {
    const token = await signAccessToken({ sub: '42', username: 'alice' }, SECRET);
    const claims = await verifyToken(token, SECRET);
    expect(claims.sub).toBe('42');
    expect(claims.username).toBe('alice');
  });

  it('错误密钥校验失败', async () => {
    const token = await signAccessToken({ sub: '42', username: 'alice' }, SECRET);
    await expect(verifyToken(token, 'wrong-secret')).rejects.toBeInstanceOf(AuthError);
  });

  it('被篡改的令牌校验失败', async () => {
    const token = await signAccessToken({ sub: '42', username: 'alice' }, SECRET);
    const tampered = `${token}x`;
    await expect(verifyToken(tampered, SECRET)).rejects.toBeInstanceOf(AuthError);
  });

  it('已过期令牌校验失败', async () => {
    const token = await signAccessToken({ sub: '1', username: 'bob' }, SECRET, '0s');
    await new Promise((r) => setTimeout(r, 1100));
    await expect(verifyToken(token, SECRET)).rejects.toBeInstanceOf(AuthError);
  });
});
