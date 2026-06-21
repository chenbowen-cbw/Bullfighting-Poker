# Bullfighting-Poker(斗牛扑克)

抢庄斗牛卡牌游戏。全栈 TypeScript,部署于 Vercel。

> 完整开发蓝图见 [`docs/开发计划.md`](docs/开发计划.md)。

## 技术栈

- **全栈框架**:Next.js 15(App Router,部署于 Vercel)
- **规则引擎**:`@bullfighting/core`(纯 TS,零运行时依赖,可穷举单测)
- **实时通信**:Ably(托管 WebSocket)
- **存储**:Vercel Postgres(Neon)+ Upstash Redis
- **定时编排**:Upstash QStash
- **测试**:Vitest / Playwright / k6

## 仓库结构(Monorepo)

```
packages/
  core/        # 斗牛规则引擎:洗牌、评牌、比牌、结算(纯函数)
apps/
  web/         # Next.js 前端 + Serverless API(后续里程碑)
docs/
  开发计划.md   # 详细开发计划
```

## 开发

需要 Node ≥ 22 与 pnpm。

```bash
pnpm install        # 安装依赖
pnpm test           # 运行所有测试
pnpm typecheck      # 类型检查
pnpm lint           # 代码检查
pnpm build          # 构建
```

只跑规则引擎的测试:

```bash
pnpm --filter @bullfighting/core test
```

## 里程碑进度

- [x] **M0** 项目初始化 — monorepo + 引擎骨架 + CI
- [x] **M1** 规则引擎 — 抢庄斗牛 评牌/比牌/结算 + 穷举单测
- [x] **M2** 用户/认证 + 数据库 — scrypt/JWT + Drizzle/Neon + 认证接口
- [x] **M3** 大厅/房间/匹配 — 房间/座位 + Redis 快速匹配 + 大厅接口
- [x] **M4** 实时对局流程 — 对局状态机 + Ably 广播 + QStash 超时 + 对局接口
- [ ] M5 结算/计分/战绩
- [ ] M6 前端 UI/动画
- [ ] M7 测试/压测/安全
- [ ] M8 部署/上线

## 玩法规则(抢庄斗牛)

- 52 张牌,每人 5 张;3 张点数之和为 10 的倍数即"成牛",余 2 张之和 `% 10` 定"牛几"(0 为牛牛)。
- 特殊牌型:五小牛 > 四炸 > 五花牛 > 牛牛 > 牛9 … 牛1 > 没牛。
- A=1,2–9 面值,10/J/Q/K=10;同型比最大单张(点数 → 花色 ♠>♥>♣>♦)。

详见 [`docs/开发计划.md`](docs/开发计划.md)。
