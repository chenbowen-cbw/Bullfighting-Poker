import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 配置(斗牛扑克 E2E)。
 *
 * 运行方式:
 *   pnpm --filter @bullfighting/e2e install:browsers   # 首次安装浏览器
 *   pnpm --filter @bullfighting/e2e test:e2e            # 跑冒烟用例
 *
 * 目标地址由环境变量 E2E_BASE_URL 决定:
 *   - 默认 http://localhost:3000(本地 `pnpm --filter @bullfighting/web dev`)
 *   - 对 Vercel Preview 跑:E2E_BASE_URL="https://<preview-url>" pnpm --filter @bullfighting/e2e test:e2e
 *
 * 依赖后端(数据库/Redis/Ably/QStash)的用例:
 *   - 仅当设置 E2E_BACKEND=1 时才执行(见 tests/*),否则 test.skip。
 *   - 这些用例应当对 Preview/Production 环境跑,而非本地纯前端。
 *
 * 注意:本配置不会自动拉起 web dev server(webServer 留空),
 *       以免被默认 pnpm test / CI 误触发而需要真实外部服务。
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  // 单文件内串行,文件间并行
  fullyParallel: true,
  // CI 上禁止 test.only 漏网
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
