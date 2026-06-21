import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/password';

describe('password', () => {
  it('正确密码可通过校验', async () => {
    const hash = await hashPassword('s3cret-pw');
    expect(await verifyPassword('s3cret-pw', hash)).toBe(true);
  });

  it('错误密码不通过', async () => {
    const hash = await hashPassword('s3cret-pw');
    expect(await verifyPassword('wrong-pw', hash)).toBe(false);
  });

  it('相同密码每次哈希不同(含随机盐)', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
    expect(await verifyPassword('same', a)).toBe(true);
    expect(await verifyPassword('same', b)).toBe(true);
  });

  it('哈希格式非法时返回 false 而不抛错', async () => {
    expect(await verifyPassword('x', 'not-a-valid-hash')).toBe(false);
    expect(await verifyPassword('x', 'bcrypt$aa$bb')).toBe(false);
  });
});
