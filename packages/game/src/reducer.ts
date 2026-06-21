import {
  createDeck,
  shuffle,
  deal,
  evaluate,
  settle,
  cryptoRng,
  type RNG,
} from '@bullfighting/core';
import type { ApplyResult, GameAction, GamePlayer, GameState, SettlementDelta } from './types';
import { GameError } from './errors';

/**
 * 对局状态机的纯函数 reducer。
 * 输入旧状态与动作,返回新状态与副作用(发牌结算/定时器),不修改入参。
 * @param rng 注入随机源(洗牌、抢庄平局),默认加密级;测试可传入可复现 PRNG。
 */
export function applyAction(
  prev: GameState,
  action: GameAction,
  rng: RNG = cryptoRng,
): ApplyResult {
  const state = structuredClone(prev);
  switch (action.type) {
    case 'START_ROUND':
      return startRound(state, action.now);
    case 'ROB':
      return rob(state, action.seatId, action.multiplier, action.now, rng);
    case 'BET':
      return bet(state, action.seatId, action.multiplier, action.now, rng);
    case 'REVEAL':
      return reveal(state, action.seatId, action.now);
    case 'TIMEOUT':
      return timeout(state, action.now, rng);
  }
}

function startRound(state: GameState, now: number): ApplyResult {
  if (state.phase !== 'waiting' && state.phase !== 'settled') {
    throw GameError.wrongPhase('仅在等待或结算后可开新局');
  }
  if (state.players.length < state.config.minPlayers) throw GameError.notEnoughPlayers();

  state.roundNo += 1;
  state.phase = 'rob_banker';
  state.bankerSeatId = null;
  for (const p of state.players) {
    p.isBanker = false;
    p.robMultiplier = null;
    p.betMultiplier = null;
    p.cards = null;
    p.hand = null;
    p.revealed = false;
    p.resultChips = null;
  }
  state.deadline = now + state.config.robMillis;
  return { state, effects: [{ type: 'scheduleTimeout', deadline: state.deadline }] };
}

function rob(
  state: GameState,
  seatId: string,
  multiplier: number,
  now: number,
  rng: RNG,
): ApplyResult {
  if (state.phase !== 'rob_banker') throw GameError.wrongPhase();
  const player = findPlayer(state, seatId);
  if (player.robMultiplier !== null) throw GameError.alreadyActed();
  if (!Number.isInteger(multiplier) || multiplier < 0 || multiplier > state.config.maxRob) {
    throw GameError.invalidMultiplier(`抢庄倍数需为 0-${state.config.maxRob}`);
  }

  player.robMultiplier = multiplier;
  if (state.players.every((p) => p.robMultiplier !== null)) {
    return enterBetting(state, now, rng);
  }
  return { state, effects: [] };
}

function bet(
  state: GameState,
  seatId: string,
  multiplier: number,
  now: number,
  rng: RNG,
): ApplyResult {
  if (state.phase !== 'betting') throw GameError.wrongPhase();
  const player = findPlayer(state, seatId);
  if (player.isBanker) throw GameError.bankerCannotBet();
  if (player.betMultiplier !== null) throw GameError.alreadyActed();
  if (!Number.isInteger(multiplier) || multiplier < 1 || multiplier > state.config.maxBet) {
    throw GameError.invalidMultiplier(`下注倍数需为 1-${state.config.maxBet}`);
  }

  player.betMultiplier = multiplier;
  if (nonBankerPlayers(state).every((p) => p.betMultiplier !== null)) {
    return enterReveal(state, now, rng);
  }
  return { state, effects: [] };
}

function reveal(state: GameState, seatId: string, now: number): ApplyResult {
  if (state.phase !== 'reveal') throw GameError.wrongPhase();
  const player = findPlayer(state, seatId);
  if (player.revealed) return { state, effects: [] };

  player.revealed = true;
  if (state.players.every((p) => p.revealed)) {
    return enterSettlement(state, now);
  }
  return { state, effects: [] };
}

function timeout(state: GameState, now: number, rng: RNG): ApplyResult {
  switch (state.phase) {
    case 'rob_banker':
      for (const p of state.players) if (p.robMultiplier === null) p.robMultiplier = 0;
      return enterBetting(state, now, rng);
    case 'betting':
      for (const p of nonBankerPlayers(state)) if (p.betMultiplier === null) p.betMultiplier = 1;
      return enterReveal(state, now, rng);
    case 'reveal':
      for (const p of state.players) p.revealed = true;
      return enterSettlement(state, now);
    case 'settled':
      state.phase = 'waiting';
      state.deadline = null;
      return { state, effects: [] };
    default:
      return { state, effects: [] };
  }
}

function enterBetting(state: GameState, now: number, rng: RNG): ApplyResult {
  const bankerSeatId = determineBanker(state.players, rng);
  state.bankerSeatId = bankerSeatId;
  for (const p of state.players) p.isBanker = p.seatId === bankerSeatId;
  state.phase = 'betting';
  state.deadline = now + state.config.betMillis;
  return { state, effects: [{ type: 'scheduleTimeout', deadline: state.deadline }] };
}

function enterReveal(state: GameState, now: number, rng: RNG): ApplyResult {
  const deck = shuffle(createDeck(), rng);
  const { hands } = deal(deck, state.players.length, 5);
  state.players.forEach((p, i) => {
    p.cards = hands[i];
    p.hand = evaluate(hands[i], state.config.rule);
  });
  state.phase = 'reveal';
  state.deadline = now + state.config.revealMillis;
  return { state, effects: [{ type: 'scheduleTimeout', deadline: state.deadline }] };
}

function enterSettlement(state: GameState, now: number): ApplyResult {
  const deltas = computeSettlement(state);
  for (const d of deltas) findPlayer(state, d.seatId).resultChips = d.delta;
  state.phase = 'settled';
  state.deadline = now + state.config.settledMillis;
  return {
    state,
    effects: [
      { type: 'settle', deltas },
      { type: 'scheduleTimeout', deadline: state.deadline },
    ],
  };
}

function computeSettlement(state: GameState): SettlementDelta[] {
  const banker = state.players.find((p) => p.isBanker);
  if (!banker || !banker.hand) throw GameError.invalidState('结算时缺少庄家或手牌');

  const bankerEntry = {
    seatId: banker.seatId,
    hand: banker.hand,
    robMultiplier: Math.max(banker.robMultiplier ?? 1, 1),
  };
  const playerEntries = nonBankerPlayers(state).map((p) => {
    if (!p.hand) throw GameError.invalidState('结算时缺少玩家手牌');
    return { seatId: p.seatId, hand: p.hand, betMultiplier: p.betMultiplier ?? 1 };
  });

  const result = settle(bankerEntry, playerEntries, { baseScore: state.baseScore });
  return [...result.deltas.entries()].map(([seatId, delta]) => ({ seatId: String(seatId), delta }));
}

/** 抢庄定庄:取最高抢庄倍数;并列则按注入随机源选其一 */
function determineBanker(players: GamePlayer[], rng: RNG): string {
  const maxRob = Math.max(...players.map((p) => p.robMultiplier ?? 0));
  const top = players.filter((p) => (p.robMultiplier ?? 0) === maxRob);
  if (top.length === 1) return top[0].seatId;
  const idx = Math.min(Math.floor(rng() * top.length), top.length - 1);
  return top[idx].seatId;
}

function nonBankerPlayers(state: GameState): GamePlayer[] {
  return state.players.filter((p) => !p.isBanker);
}

function findPlayer(state: GameState, seatId: string): GamePlayer {
  const player = state.players.find((p) => p.seatId === seatId);
  if (!player) throw GameError.notInGame();
  return player;
}
