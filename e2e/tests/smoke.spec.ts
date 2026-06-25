import { test, expect } from '@playwright/test';

/**
 * 冒烟测试(不依赖后端服务)。
 *
 * 仅验证前端页面可正常渲染、关键文案/元素存在。
 * 这些用例对任意已部署环境(本地 dev / Vercel Preview / Production)均可跑,
 * 不需要数据库 / Redis / Ably / QStash 等外部依赖。
 */

test.describe('冒烟:页面可渲染', () => {
  test('门户首页可访问并渲染游戏墙', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.ok()).toBeTruthy();

    // 门户标题与 Hero 大标题
    await expect(page).toHaveTitle(/像素游戏厅/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('PIXEL ARCADE');
    // 游戏卡片墙含已上线的「抢庄斗牛」
    await expect(page.getByRole('heading', { name: '抢庄斗牛' })).toBeVisible();
    // 公开可访问:未登录也能看到入口 CTA(不再立即跳登录)
    await expect(page.getByRole('button', { name: '进入抢庄斗牛' })).toBeVisible();
  });

  test('健康检查端点返回 ok', async ({ request }) => {
    // /api/health 不触达外部依赖,可作为前端冒烟的一部分
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { status?: string };
    expect(body.status).toBe('ok');
  });

  test('安全响应头已注入', async ({ request }) => {
    const res = await request.get('/');
    const headers = res.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBeTruthy();
    expect(headers['content-security-policy']).toBeTruthy();
  });
});

/**
 * 待开发页面占位说明:
 * 登录 / 注册等独立页面在后续里程碑(前端 UI)中实现。
 * 届时可在此补充"登录页 / 注册页可渲染"的纯前端冒烟用例,例如:
 *   await page.goto('/login');
 *   await expect(page.getByLabel('用户名')).toBeVisible();
 * 当前仓库尚无这些页面,故先不写以免必然失败。
 */
test.describe('占位:登录/注册页(待前端里程碑)', () => {
  test.skip('登录页可渲染', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading')).toBeVisible();
  });

  test.skip('注册页可渲染', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading')).toBeVisible();
  });
});
