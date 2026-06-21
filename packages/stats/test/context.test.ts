import { describe, expect, it } from 'vitest';
import { evaluate, settle, Suit, type Card, type Rank } from '@bullfighting/core';
import { buildSettlementContext, computeRoundPersistence } from '../src';

/** 简写构造一张牌 */
function c(suit: Suit, rank: Rank): Card {
  return { suit, rank };
}

/**
 * 用真实的 core.evaluate + core.settle 跑一局,
 * 校验 buildSettlementContext → computeRoundPersistence 的端到端纯映射。
 */
describe('buildSettlementContext', () => {
  it('从 core 结算结果构造上下文:cards/牛型/resultChips 一致且零和', () => {
    // 庄家:牛牛(K+K + 10/10/10 → 三张成牛、两张牛牛)
    const bankerHand = evaluate([
      c(Suit.Spades, 13),
      c(Suit.Hearts, 13),
      c(Suit.Clubs, 10),
      c(Suit.Diamonds, 10),
      c(Suit.Spades, 10),
    ]);
    // 闲家:没牛(随意 5 张,不成牛)
    const playerHand = evaluate([
      c(Suit.Spades, 2),
      c(Suit.Hearts, 3),
      c(Suit.Clubs, 4),
      c(Suit.Diamonds, 6),
      c(Suit.Spades, 9),
    ]);

    const result = settle(
      { seatId: 1, hand: bankerHand, robMultiplier: 2 },
      [{ seatId: 2, hand: playerHand, betMultiplier: 1 }],
      { baseScore: 1 },
    );

    const ctx = buildSettlementContext({
      roomId: 100,
      roundNo: 1,
      bankerSeatId: 1,
      baseScore: 1,
      shuffleSeed: 'seed-x',
      seats: [
        {
          seatId: 1,
          seatNo: 0,
          hand: bankerHand,
          isBanker: true,
          betMultiplier: 1,
          robMultiplier: 2,
        },
        {
          seatId: 2,
          seatNo: 1,
          hand: playerHand,
          isBanker: false,
          betMultiplier: 1,
          robMultiplier: 1,
        },
      ],
      settlement: result,
    });

    expect(ctx.roomId).toBe(100);
    expect(ctx.bankerSeatId).toBe(1);
    expect(ctx.players).toHaveLength(2);

    const banker = ctx.players.find((p) => p.userId === 1)!;
    const player = ctx.players.find((p) => p.userId === 2)!;

    // niuType/niuValue 透传自 HandResult
    expect(banker.niuType).toBe(bankerHand.type);
    expect(banker.niuValue).toBe(bankerHand.niuValue);
    expect(banker.cards).toBe(bankerHand.cards);

    // resultChips 取自 settle 的 deltas
    expect(banker.resultChips).toBe(result.deltas.get(1));
    expect(player.resultChips).toBe(result.deltas.get(2));

    // 庄家赢:庄正闲负,零和
    expect(banker.resultChips).toBeGreaterThan(0);
    expect(player.resultChips).toBeLessThan(0);
    expect(banker.resultChips + player.resultChips).toBe(0);
  });

  it('上下文可直接喂给 computeRoundPersistence', () => {
    const h = evaluate([
      c(Suit.Spades, 13),
      c(Suit.Hearts, 13),
      c(Suit.Clubs, 10),
      c(Suit.Diamonds, 10),
      c(Suit.Spades, 10),
    ]);
    const result = settle(
      { seatId: 1, hand: h, robMultiplier: 1 },
      [{ seatId: 2, hand: h, betMultiplier: 1 }],
      { baseScore: 1 },
    );
    const ctx = buildSettlementContext({
      roomId: 1,
      roundNo: 1,
      bankerSeatId: 1,
      baseScore: 1,
      seats: [
        { seatId: 1, seatNo: 0, hand: h, isBanker: true, betMultiplier: 1, robMultiplier: 1 },
        { seatId: 2, seatNo: 1, hand: h, isBanker: false, betMultiplier: 1, robMultiplier: 1 },
      ],
      settlement: result,
    });
    const { round, roundPlayers, statsDeltas } = computeRoundPersistence(ctx);
    expect(round.roundNo).toBe(1);
    expect(roundPlayers).toHaveLength(2);
    expect(statsDeltas).toHaveLength(2);
    // 净额零和
    expect(statsDeltas.reduce((a, s) => a + s.roundNet, 0)).toBe(0);
  });
});
