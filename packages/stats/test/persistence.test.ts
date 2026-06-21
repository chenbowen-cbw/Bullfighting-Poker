import { describe, expect, it } from 'vitest';
import {
  computeRoundPersistence,
  SETTLED_PHASE,
  type RoundSettlementContext,
  type SettlementPlayer,
} from '../src';

/** 构造一个玩家结算条目的便捷函数 */
function player(over: Partial<SettlementPlayer>): SettlementPlayer {
  return {
    userId: 1,
    seatNo: 0,
    cards: [{ suit: 'S', rank: 10 }],
    niuType: 'NONE',
    niuValue: -1,
    isBanker: false,
    betMultiplier: 1,
    robMultiplier: 1,
    resultChips: 0,
    ...over,
  };
}

/** 一个典型的三人局:庄家赢、闲家甲输、闲家乙赢 */
function sampleContext(): RoundSettlementContext {
  return {
    roomId: 42,
    roundNo: 3,
    bankerSeatId: 1,
    baseScore: 2,
    shuffleSeed: 'seed-abc',
    players: [
      player({
        userId: 1,
        seatNo: 0,
        isBanker: true,
        robMultiplier: 2,
        niuType: 'NIU_NIU',
        niuValue: 0,
        resultChips: 4,
      }),
      player({
        userId: 2,
        seatNo: 1,
        betMultiplier: 2,
        resultChips: -10,
        niuType: 'NIU_5',
        niuValue: 5,
      }),
      player({
        userId: 3,
        seatNo: 2,
        betMultiplier: 1,
        resultChips: 6,
        niuType: 'NIU_9',
        niuValue: 9,
      }),
    ],
  };
}

describe('computeRoundPersistence', () => {
  it('rounds 行带上下文与 settled 阶段', () => {
    const { round } = computeRoundPersistence(sampleContext());
    expect(round).toEqual({
      roomId: 42,
      roundNo: 3,
      bankerUserId: 1,
      shuffleSeed: 'seed-abc',
      shuffleProof: null,
      phase: SETTLED_PHASE,
    });
  });

  it('round_players 原样落盘 cards/牛型/倍数/结果', () => {
    const { roundPlayers } = computeRoundPersistence(sampleContext());
    expect(roundPlayers).toHaveLength(3);
    expect(roundPlayers[0]).toEqual({
      userId: 1,
      seatNo: 0,
      cards: [{ suit: 'S', rank: 10 }],
      niuType: 'NIU_NIU',
      niuValue: 0,
      isBanker: true,
      betMultiplier: 1,
      robMultiplier: 2,
      resultChips: 4,
    });
    expect(roundPlayers[1].resultChips).toBe(-10);
    expect(roundPlayers[2].niuType).toBe('NIU_9');
  });

  it('user_stats 增量:胜负、坐庄、赢/输累加正确', () => {
    const { statsDeltas } = computeRoundPersistence(sampleContext());
    // 庄家(net=+4):胜 1、坐庄 1、totalWon 4、totalLost 0
    expect(statsDeltas[0]).toEqual({
      userId: 1,
      roundsPlayed: 1,
      roundsWon: 1,
      bankerRounds: 1,
      totalWon: 4,
      totalLost: 0,
      roundNet: 4,
    });
    // 闲家甲(net=-10):负、totalLost 10
    expect(statsDeltas[1]).toEqual({
      userId: 2,
      roundsPlayed: 1,
      roundsWon: 0,
      bankerRounds: 0,
      totalWon: 0,
      totalLost: 10,
      roundNet: -10,
    });
    // 闲家乙(net=+6):胜、totalWon 6
    expect(statsDeltas[2].roundsWon).toBe(1);
    expect(statsDeltas[2].totalWon).toBe(6);
    expect(statsDeltas[2].bankerRounds).toBe(0);
  });

  it('净额为 0 既不计胜也不计赢/输', () => {
    const { statsDeltas } = computeRoundPersistence({
      roomId: 1,
      roundNo: 1,
      bankerSeatId: 1,
      baseScore: 1,
      players: [player({ userId: 1, resultChips: 0, isBanker: true })],
    });
    expect(statsDeltas[0]).toMatchObject({
      roundsPlayed: 1,
      roundsWon: 0,
      bankerRounds: 1,
      totalWon: 0,
      totalLost: 0,
      roundNet: 0,
    });
  });

  it('结算零和:全部玩家净额之和为 0', () => {
    const { statsDeltas } = computeRoundPersistence(sampleContext());
    const sum = statsDeltas.reduce((acc, s) => acc + s.roundNet, 0);
    expect(sum).toBe(0);
  });

  it('无庄家时 bankerUserId 为 null', () => {
    const { round } = computeRoundPersistence({
      roomId: 9,
      roundNo: 1,
      bankerSeatId: null,
      baseScore: 1,
      players: [player({ userId: 1, resultChips: 1 })],
    });
    expect(round.bankerUserId).toBeNull();
  });

  it('cards 缺省时落 null,niuType/niuValue 透传', () => {
    const { roundPlayers } = computeRoundPersistence({
      roomId: 1,
      roundNo: 1,
      bankerSeatId: 1,
      baseScore: 1,
      players: [
        player({ userId: 1, cards: undefined, niuType: null, niuValue: null, isBanker: true }),
      ],
    });
    expect(roundPlayers[0].cards).toBeNull();
    expect(roundPlayers[0].niuType).toBeNull();
    expect(roundPlayers[0].niuValue).toBeNull();
  });

  it('字符串 userId 也能透传(SeatId 兼容 string)', () => {
    const { roundPlayers, statsDeltas } = computeRoundPersistence({
      roomId: 'room-1',
      roundNo: 1,
      bankerSeatId: 'user-1',
      baseScore: 1,
      players: [player({ userId: 'user-1', resultChips: 5, isBanker: true })],
    });
    expect(roundPlayers[0].userId).toBe('user-1');
    expect(statsDeltas[0].userId).toBe('user-1');
  });
});
