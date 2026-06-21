import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../src/service';
import { InMemoryUserRepository } from '../src/repository';
import { AuthError } from '../src/errors';

const CONFIG = { jwtSecret: 'unit-test-secret', initialChips: 10000 };

function makeService(): AuthService {
  return new AuthService(new InMemoryUserRepository(), CONFIG);
}

describe('AuthService', () => {
  let svc: AuthService;
  beforeEach(() => {
    svc = makeService();
  });

  it('注册成功:返回公开用户 + 令牌,初始筹码到账,且不泄露密码哈希', async () => {
    const { user, token } = await svc.register({ username: 'alice', password: 'pw1234' });
    expect(user.username).toBe('alice');
    expect(user.nickname).toBe('alice');
    expect(user.chips).toBe(10000);
    expect(token).toBeTruthy();
    expect((user as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('注册令牌可用于 authenticate 取回当前用户', async () => {
    const { token } = await svc.register({ username: 'alice', password: 'pw1234' });
    const me = await svc.authenticate(token);
    expect(me.username).toBe('alice');
  });

  it('用户名重复注册被拒', async () => {
    await svc.register({ username: 'alice', password: 'pw1234' });
    await expect(svc.register({ username: 'alice', password: 'other1' })).rejects.toMatchObject({
      code: 'USERNAME_TAKEN',
    });
  });

  it('非法用户名/弱密码被拒', async () => {
    await expect(svc.register({ username: 'ab', password: 'pw1234' })).rejects.toBeInstanceOf(
      AuthError,
    );
    await expect(svc.register({ username: 'alice', password: '123' })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
  });

  it('登录成功并校验密码', async () => {
    await svc.register({ username: 'alice', password: 'pw1234' });
    const { user } = await svc.login({ username: 'alice', password: 'pw1234' });
    expect(user.username).toBe('alice');
  });

  it('错误密码或不存在用户均返回 INVALID_CREDENTIALS', async () => {
    await svc.register({ username: 'alice', password: 'pw1234' });
    await expect(svc.login({ username: 'alice', password: 'nope' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    await expect(svc.login({ username: 'ghost', password: 'pw1234' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('getById 不存在时抛 USER_NOT_FOUND', async () => {
    await expect(svc.getById('999')).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });
});
