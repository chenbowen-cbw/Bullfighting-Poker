# 压测(k6)

对斗牛扑克接口做并发压测,关注 **p95 延迟**与**错误率**。

> 仅对 **Vercel Preview** 环境跑,**切勿压生产**。压测会写入真实数据库
> (注册大量临时用户、建房),Preview 用独立 Neon/Upstash 资源更安全。

## 安装 k6

- macOS:`brew install k6`
- Linux:见 https://k6.io/docs/get-started/installation/
- Docker:`docker run --rm -i grafana/k6 run - <脚本`

## 脚本

| 脚本               | 覆盖范围                                             |
| ------------------ | ---------------------------------------------------- |
| `k6-auth-smoke.js` | 健康检查 + 注册/登录(最小基线,低并发短时长)          |
| `k6-game-flow.js`  | 登录 → 建房 → 开局 → 抢庄/下注/亮牌(全流程,尽力而为) |

对局接口(`/api/game/[roomId]/{start,rob-banker,bet,reveal}`)在后续里程碑提供;
脚本对缺失接口(404/405)记为"跳过"而非失败,因此在任意阶段都能跑出延迟画像。

## 运行示例

```bash
# 1) 最小基线
k6 run -e BASE_URL="https://<preview-url>" infra/load/k6-auth-smoke.js

# 2) 全流程,20 VU 压 1 分钟
k6 run \
  -e BASE_URL="https://<preview-url>" \
  -e VUS=20 \
  -e DURATION=1m \
  infra/load/k6-game-flow.js
```

### 可调环境变量

| 变量         | 默认                   | 说明                                     |
| ------------ | ---------------------- | ---------------------------------------- |
| `BASE_URL`   | (必填)                 | Preview 根地址,如 `https://x.vercel.app` |
| `VUS`        | `20`(flow)/`10`(smoke) | 并发虚拟用户数                           |
| `DURATION`   | `1m` / `30s`           | 稳定段时长                               |
| `PASSWORD`   | `Passw0rd!k6`          | 注册/登录口令                            |
| `MATCH_SIZE` | `4`                    | 建房人数上限                             |

## 看什么

- **p95**:`http_req_duration` 的 `p(95)`,以及自定义 `step_login` / `step_create_room`
  等分步 Trend。阈值在脚本 `options.thresholds` 中,超阈值 k6 退出码非 0。
- **错误率**:`http_req_failed`(传输层)与 `biz_errors`(业务层,非预期状态码)。
- **跳过步骤**:`skipped_steps` 计数,提示哪些接口尚未实现。

## 阈值基线(可按实测收紧)

- 整体 `http_req_duration p(95) < 800ms`
- 登录 `step_login p(95) < 600ms`
- 业务错误率 `biz_errors < 5%`

> Vercel Serverless 冷启动会拉高首批请求延迟;压测脚本含 15s ramp-up 预热,
> 解读 p95 时优先看稳定段。必要时先用 `k6-auth-smoke.js` 预热再跑全流程。
