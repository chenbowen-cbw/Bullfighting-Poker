import type { Card, HandResult } from '@bullfighting/core';
import { DEFAULT_GAME_CONFIG, type GameConfig } from './config';
import type { GamePhase, GamePlayer, GameState } from './types';

export interface SeatInput {
  seatId: string;
  seatNo: number;
}

/** 创建一局的初始(waiting)状态 */
export function createInitialState(input: {
  roomId: string;
  baseScore: number;
  seats: SeatInput[];
  config?: GameConfig;
  roundNo?: number;
}): GameState {
  const players: GamePlayer[] = input.seats
    .slice()
    .sort((a, b) => a.seatNo - b.seatNo)
    .map((s) => ({
      seatId: s.seatId,
      seatNo: s.seatNo,
      isBanker: false,
      robMultiplier: null,
      betMultiplier: null,
      cards: null,
      hand: null,
      revealed: false,
      resultChips: null,
    }));

  return {
    roomId: input.roomId,
    roundNo: input.roundNo ?? 0,
    phase: 'waiting',
    baseScore: input.baseScore,
    bankerSeatId: null,
    players,
    deadline: null,
    config: input.config ?? DEFAULT_GAME_CONFIG,
  };
}

/** 对外的玩家视图(按可见性裁剪手牌) */
export interface PublicGamePlayer {
  seatId: string;
  seatNo: number;
  isBanker: boolean;
  robMultiplier: number | null;
  betMultiplier: number | null;
  revealed: boolean;
  /** 当前阶段是否已完成应做的操作 */
  hasActed: boolean;
  cards: Card[] | null;
  hand: HandResult | null;
  resultChips: number | null;
}

export interface PublicGameState {
  roomId: string;
  roundNo: number;
  phase: GamePhase;
  baseScore: number;
  bankerSeatId: string | null;
  deadline: number | null;
  players: PublicGamePlayer[];
}

/**
 * 把权威状态投影为对外视图。
 * 他人手牌仅在「亮牌后」或「结算阶段」可见;本人(viewerSeatId)始终可见自己的牌。
 */
export function projectState(state: GameState, viewerSeatId?: string): PublicGameState {
  return {
    roomId: state.roomId,
    roundNo: state.roundNo,
    phase: state.phase,
    baseScore: state.baseScore,
    bankerSeatId: state.bankerSeatId,
    deadline: state.deadline,
    players: state.players.map((p) => {
      const visible = state.phase === 'settled' || p.revealed || p.seatId === viewerSeatId;
      const hasActed = playerHasActed(state.phase, p);
      return {
        seatId: p.seatId,
        seatNo: p.seatNo,
        isBanker: p.isBanker,
        robMultiplier: p.robMultiplier,
        betMultiplier: p.betMultiplier,
        revealed: p.revealed,
        hasActed,
        cards: visible ? p.cards : null,
        hand: visible ? p.hand : null,
        resultChips: p.resultChips,
      };
    }),
  };
}

function playerHasActed(phase: GamePhase, p: GamePlayer): boolean {
  switch (phase) {
    case 'rob_banker':
      return p.robMultiplier !== null;
    case 'betting':
      return p.isBanker || p.betMultiplier !== null;
    case 'reveal':
      return p.revealed;
    default:
      return false;
  }
}
