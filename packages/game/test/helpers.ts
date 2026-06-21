import { createInitialState } from '../src/state';
import type { GameState } from '../src/types';

export const SEATS = [
  { seatId: 'A', seatNo: 0 },
  { seatId: 'B', seatNo: 1 },
  { seatId: 'C', seatNo: 2 },
];

export function freshGame(): GameState {
  return createInitialState({ roomId: 'r1', baseScore: 10, seats: SEATS });
}
