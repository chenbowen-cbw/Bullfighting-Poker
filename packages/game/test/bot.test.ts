import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@bullfighting/core';
import { createInitialState } from '../src/state';
import { applyAction } from '../src/reducer';
import { makeBotDecision, isBotSeatId, type BotDifficulty } from '../src/bot';
import { GameError } from '../src/errors';
import type { GameState } from '../src/types';

const DIFFICULTIES: BotDifficulty[] = ['easy', 'medium', 'hard'];

function game(): GameState {
  return createInitialState({
    roomId: 'pve:test',
    baseScore: 10,
    seats: [
      { seatId: 'bot:1', seatNo: 0 },
      { seatId: 'bot:2', seatNo: 1 },
      { seatId: 'bot:3', seatNo: 2 },
    ],
  });
}

describe('isBotSeatId', () => {
  it('仅 bot: 前缀视为机器人', () => {
    expect(isBotSeatId('bot:1')).toBe(true);
    expect(isBotSeatId('user-123')).toBe(false);
  });
});

describe('makeBotDecision 抢庄阶段', () => {
  it('多种子 × 全难度:返回合法 ROB 动作,倍数 ∈ [0, maxRob]', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 300; seed++) {
        const rng = mulberry32(seed);
        const s = applyAction(game(), { type: 'START_ROUND', now: 0 }, rng).state;
        const action = makeBotDecision(s, 'bot:1', difficulty, rng);
        expect(action.type).toBe('ROB');
        if (action.type === 'ROB') {
          expect(action.seatId).toBe('bot:1');
          expect(Number.isInteger(action.multiplier)).toBe(true);
          expect(action.multiplier).toBeGreaterThanOrEqual(0);
          expect(action.multiplier).toBeLessThanOrEqual(s.config.maxRob);
          // 动作可被 reducer 接受
          expect(() => applyAction(s, action, rng)).not.toThrow();
        }
      }
    }
  });

  it('已抢庄的机器人再次决策抛错', () => {
    const rng = mulberry32(1);
    let s = applyAction(game(), { type: 'START_ROUND', now: 0 }, rng).state;
    s = applyAction(s, { type: 'ROB', seatId: 'bot:1', multiplier: 1, now: 1 }, rng).state;
    expect(() => makeBotDecision(s, 'bot:1', 'medium', rng)).toThrow(GameError);
  });
});

describe('makeBotDecision 下注阶段', () => {
  /** 推进到 betting 阶段(全员抢庄,定出庄家) */
  function bettingState(seed: number): GameState {
    const rng = mulberry32(seed);
    let s = applyAction(game(), { type: 'START_ROUND', now: 0 }, rng).state;
    s = applyAction(s, { type: 'ROB', seatId: 'bot:1', multiplier: 0, now: 1 }, rng).state;
    s = applyAction(s, { type: 'ROB', seatId: 'bot:2', multiplier: 3, now: 2 }, rng).state;
    s = applyAction(s, { type: 'ROB', seatId: 'bot:3', multiplier: 1, now: 3 }, rng).state;
    return s;
  }

  it('多种子 × 全难度:非庄家返回合法 BET 动作,倍数 ∈ [1, maxBet]', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 300; seed++) {
        const rng = mulberry32(seed + 1000);
        const s = bettingState(seed);
        expect(s.phase).toBe('betting');
        const nonBanker = s.players.find((p) => !p.isBanker)!;
        const action = makeBotDecision(s, nonBanker.seatId, difficulty, rng);
        expect(action.type).toBe('BET');
        if (action.type === 'BET') {
          expect(Number.isInteger(action.multiplier)).toBe(true);
          expect(action.multiplier).toBeGreaterThanOrEqual(1);
          expect(action.multiplier).toBeLessThanOrEqual(s.config.maxBet);
          expect(() => applyAction(s, action, rng)).not.toThrow();
        }
      }
    }
  });

  it('为庄家决策下注会抛错', () => {
    const s = bettingState(7);
    const banker = s.players.find((p) => p.isBanker)!;
    expect(() => makeBotDecision(s, banker.seatId, 'hard', mulberry32(1))).toThrow(GameError);
  });
});

describe('makeBotDecision 亮牌阶段', () => {
  it('返回 REVEAL 动作', () => {
    const rng = mulberry32(5);
    let s = applyAction(game(), { type: 'START_ROUND', now: 0 }, rng).state;
    s = applyAction(s, { type: 'ROB', seatId: 'bot:1', multiplier: 0, now: 1 }, rng).state;
    s = applyAction(s, { type: 'ROB', seatId: 'bot:2', multiplier: 2, now: 2 }, rng).state;
    s = applyAction(s, { type: 'ROB', seatId: 'bot:3', multiplier: 0, now: 3 }, rng).state;
    // 两名闲家下注 → 进入 reveal
    const nonBankers = s.players.filter((p) => !p.isBanker);
    for (const p of nonBankers) {
      s = applyAction(s, { type: 'BET', seatId: p.seatId, multiplier: 1, now: 4 }, rng).state;
    }
    expect(s.phase).toBe('reveal');
    const action = makeBotDecision(s, 'bot:1', 'easy', rng);
    expect(action.type).toBe('REVEAL');
  });
});

describe('makeBotDecision 非行动阶段抛错', () => {
  it('waiting 阶段抛错', () => {
    expect(() => makeBotDecision(game(), 'bot:1', 'medium', mulberry32(1))).toThrow(GameError);
  });

  it('未知座位抛错', () => {
    const rng = mulberry32(1);
    const s = applyAction(game(), { type: 'START_ROUND', now: 0 }, rng).state;
    expect(() => makeBotDecision(s, 'bot:999', 'medium', rng)).toThrow(GameError);
  });
});

describe('makeBotDecision 确定性', () => {
  it('相同种子产生相同决策', () => {
    const s = applyAction(game(), { type: 'START_ROUND', now: 0 }, mulberry32(1)).state;
    const a = makeBotDecision(s, 'bot:1', 'hard', mulberry32(42));
    const b = makeBotDecision(s, 'bot:1', 'hard', mulberry32(42));
    expect(a).toEqual(b);
  });
});
