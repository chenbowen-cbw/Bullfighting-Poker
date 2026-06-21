# @bullfighting/e2e — 端到端测试(Playwright)

独立 workspace 包,**不进入默认 `pnpm test` / CI 阻塞**(它需要起服务或指向已部署环境)。

## 快速开始

```bash
# 1) 安装依赖(在仓库根)
pnpm install

# 2) 安装浏览器(首次)
pnpm --filter @bullfighting/e2e install:browsers

# 3a) 对本地 dev 跑冒烟用例(另开终端先起 web)
pnpm --filter @bullfighting/web dev          # 终端 A,默认 http://localhost:3000
pnpm --filter @bullfighting/e2e test:e2e     # 终端 B

# 3b) 对 Vercel Preview 跑(无需本地起服务)
E2E_BASE_URL="https://<preview-url>" pnpm --filter @bullfighting/e2e test:e2e
```

## 环境变量

| 变量           | 默认                    | 说明                                               |
| -------------- | ----------------------- | -------------------------------------------------- |
| `E2E_BASE_URL` | `http://localhost:3000` | 被测站点根地址(本地 dev 或 Preview/Production URL) |
| `E2E_BACKEND`  | 未设置                  | 设为 `1` 才会跑"依赖后端"的用例(注册→登录→建房)    |
| `CI`           | 未设置                  | CI 上启用重试与单 worker                           |

## 用例分层

- `tests/smoke.spec.ts` — **不依赖后端**:首页渲染、`/api/health`、安全响应头。
  对任意环境(含纯前端)均可跑。
- `tests/backend-flow.spec.ts` — **依赖后端**(Neon/Upstash):注册→登录→取用户→建房。
  仅当 `E2E_BACKEND=1` 时执行;推荐对 Preview 环境跑。
- 登录页 / 注册页等独立 UI 页面在后续前端里程碑落地,届时补充纯前端冒烟用例
  (当前已用 `test.skip` 占位)。

## 为什么不进默认 test / CI

- E2E 需要一个真实可访问的站点(本地 dev server 或 Preview 部署),
  在单元测试阶段强行拉起会引入外部依赖、变慢、易 flaky。
- 因此 `package.json` 的 `test` 脚本为 no-op;真正的 E2E 用 `test:e2e`。
- 可选的手动触发工作流见 `.github/workflows/e2e.yml`(workflow_dispatch)。
