import { cryptoRng, type RNG } from '@bullfighting/core';
import { GameError } from './errors';
import type { GameAction, GamePlayer, GameState } from './types';

/** 机器人难度:影响抢庄/下注的激进程度(决策为盲注,不依赖手牌强弱) */
export type BotDifficulty = 'easy' | 'medium' | 'hard';

/** 机器人座位前缀:座位标识形如 `bot:1`、`bot:2` … */
export const BOT_SEAT_PREFIX = 'bot:';

/** 判断某座位标识是否为机器人 */
export function isBotSeatId(seatId: string): boolean {
  return seatId.startsWith(BOT_SEAT_PREFIX);
}

/**
 * 抢庄倍数的难度权重(索引 = 倍数 0..maxRob)。
 * 牌在下注后才发,抢庄/下注对所有人都是盲注;机器人只能按难度调激进度,
 * 不能利用手牌强弱。难度越高,均值越高、分布越满。
 */
function robWeights(difficulty: BotDifficulty, maxRob: number): number[] {
  const w = new Array<number>(maxRob + 1).fill(0);
  switch (difficulty) {
    case 'easy':
      // 偏保守:多数不抢或抢 1 倍,几乎不冲高倍
      for (let m = 0; m <= maxRob; m++) {
        if (m === 0) w[m] = 5;
        else if (m === 1) w[m] = 3;
        else if (m === 2) w[m] = 1;
        else w[m] = 0.15;
      }
      break;
    case 'medium':
      // 中庸:集中在 0..2,高倍小概率
      for (let m = 0; m <= maxRob; m++) {
        if (m <= 2) w[m] = 3 - m * 0.6;
        else w[m] = 0.6;
      }
      break;
    case 'hard':
      // 激进:分布更满,均值更高(线性偏向高倍 + 基底)
      for (let m = 0; m <= maxRob; m++) {
        w[m] = 1 + m * 1.2;
      }
      break;
  }
  return w;
}

/**
 * 下注倍数的难度权重(索引 0 = 倍数 1，依次到 maxBet)。
 * 下注下限为 1(不能为 0)。难度越高越倾向加注。
 */
function betWeights(difficulty: BotDifficulty, maxBet: number): number[] {
  const span = maxBet; // 倍数 1..maxBet 共 maxBet 个档位
  const w = new Array<number>(span).fill(0);
  for (let i = 0; i < span; i++) {
    const multiplier = i + 1;
    switch (difficulty) {
      case 'easy':
        // 偏向最小注 1，高注极少
        w[i] = multiplier === 1 ? 5 : Math.max(0.15, 1.5 - (multiplier - 1) * 0.5);
        break;
      case 'medium':
        // 集中在中低档
        w[i] = Math.max(0.5, 3 - Math.abs(multiplier - 2));
        break;
      case 'hard':
        // 偏向高注
        w[i] = 1 + (multiplier - 1) * 1.1;
        break;
    }
  }
  return w;
}

/** 按权重在 [0, weights.length) 中抽取一个索引(rng ∈ [0,1)) */
function weightedPick(weights: number[], rng: RNG): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

function findBot(state: GameState, botSeatId: string): GamePlayer {
  const bot = state.players.find((p) => p.seatId === botSeatId);
  if (!bot) throw GameError.notInGame('机器人不在本局对局中');
  return bot;
}

/**
 * 为机器人在「当前阶段的应做操作」生成一个合法动作。
 *
 * - rob_banker → ROB,倍数 ∈ [0, maxRob],按难度加权(盲注)。
 * - betting(且非庄家) → BET,倍数 ∈ [1, maxBet],按难度加权(盲注)。
 * - reveal → REVEAL。
 * - 其他阶段 / 无需操作 → 抛错(调用方应只在机器人确需行动时调用)。
 *
 * 注入 rng 可复现(默认加密级),便于单测。
 */
export function makeBotDecision(
  state: GameState,
  botSeatId: string,
  difficulty: BotDifficulty,
  rng: RNG = cryptoRng,
): GameAction {
  const bot = findBot(state, botSeatId);
  const now = Date.now();

  switch (state.phase) {
    case 'rob_banker': {
      if (bot.robMultiplier !== null) {
        throw GameError.alreadyActed('机器人已抢庄,无需再次决策');
      }
      const multiplier = weightedPick(robWeights(difficulty, state.config.maxRob), rng);
      return { type: 'ROB', seatId: botSeatId, multiplier, now };
    }
    case 'betting': {
      if (bot.isBanker) {
        throw GameError.bankerCannotBet('庄家无需下注,不应为庄家机器人决策');
      }
      if (bot.betMultiplier !== null) {
        throw GameError.alreadyActed('机器人已下注,无需再次决策');
      }
      const multiplier = weightedPick(betWeights(difficulty, state.config.maxBet), rng) + 1;
      return { type: 'BET', seatId: botSeatId, multiplier, now };
    }
    case 'reveal': {
      // 亮牌为机械操作,重复亮牌由 reducer 幂等处理;此处只在未亮时被调用
      return { type: 'REVEAL', seatId: botSeatId, now };
    }
    default:
      throw GameError.wrongPhase(`机器人在阶段 ${state.phase} 无需操作`);
  }
}
