import { test, expect } from '@playwright/test';

/**
 * 依赖后端服务的端到端流程(需真实 数据库 / Redis)。
 *
 * 运行门控:仅当 E2E_BACKEND=1 时执行,否则整组 skip。
 * 推荐对 Vercel Preview 环境跑(已配置好 Neon / Upstash 等 env):
 *
 *   E2E_BACKEND=1 \
 *   E2E_BASE_URL="https://<preview-url>" \
 *   pnpm --filter @bullfighting/e2e test:e2e backend-flow
 *
 * 覆盖的真实 REST 流程:注册 → 登录 → 取当前用户 → 建房。
 * 不在本地默认跑,避免依赖外部服务而 flaky / 阻塞 CI。
 */

const BACKEND_ENABLED = process.env.E2E_BACKEND === '1';

test.describe('后端流程:注册→登录→建房', () => {
  test.skip(!BACKEND_ENABLED, '需设置 E2E_BACKEND=1 并指向具备后端的环境(如 Preview)');

  test('完整 REST 流程可用', async ({ request }) => {
    const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const username = `e2e_${suffix}`;
    const password = 'Passw0rd!e2e';

    // 1) 注册
    const reg = await request.post('/api/auth/register', {
      data: { username, password },
    });
    expect(reg.ok(), `注册失败: ${reg.status()}`).toBeTruthy();

    // 2) 登录,拿到访问令牌
    const login = await request.post('/api/auth/login', {
      data: { username, password },
    });
    expect(login.ok(), `登录失败: ${login.status()}`).toBeTruthy();
    const loginBody = (await login.json()) as { token?: string };
    expect(loginBody.token, '登录响应缺少 token').toBeTruthy();
    const token = loginBody.token!;

    // 3) 取当前用户
    const me = await request.get('/api/auth/me', {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(me.ok(), `取用户失败: ${me.status()}`).toBeTruthy();

    // 4) 建房(需带鉴权)
    const room = await request.post('/api/rooms', {
      headers: { authorization: `Bearer ${token}` },
      data: { baseScore: 1, maxPlayers: 4 },
    });
    // 不同实现的字段可能不同,这里只断言成功创建(2xx)
    expect(room.ok(), `建房失败: ${room.status()}`).toBeTruthy();
  });
});
