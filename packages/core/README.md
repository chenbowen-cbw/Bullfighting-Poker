# @bullfighting/core

抢庄斗牛规则引擎。**纯函数,零运行时依赖**——可在 Node、浏览器、Vercel Serverless 函数中运行,并可被穷举单测。

## 能力

- `createDeck` / `shuffle` / `deal` — 牌组、洗牌(可注入 RNG)、发牌
- `evaluate(cards)` — 评定牛型(含五小牛、四炸、五花牛等特殊牌型)
- `compareHands(a, b)` — 比牌(含花色 tiebreak、四炸比四条点数)
- `settle(banker, players, config)` — 抢庄结算(零和、筹码守恒)
- `mulberry32` / `cryptoRng` — 可复现 PRNG 与加密级随机源
- `DEFAULT_RULE_CONFIG` — 可调的倍率/权重/特殊牌型开关

## 用法

```ts
import { createDeck, shuffle, deal, evaluate, settle, mulberry32 } from '@bullfighting/core';

const deck = shuffle(createDeck(), mulberry32(Date.now()));
const { hands } = deal(deck, 4); // 4 人

const banker = { seatId: 'A', hand: evaluate(hands[0]), robMultiplier: 2 };
const players = hands.slice(1).map((h, i) => ({
  seatId: `P${i}`,
  hand: evaluate(h),
  betMultiplier: 1,
}));

const { deltas } = settle(banker, players, { baseScore: 10 });
```

## 测试

```bash
pnpm --filter @bullfighting/core test
```

包含对全部 `C(52,5)=2,598,960` 种手牌的穷举校验。
