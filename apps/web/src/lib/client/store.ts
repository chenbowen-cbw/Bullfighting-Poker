/**
 * Zustand 全局状态。
 * - useAuthStore:JWT + 当前用户(并与 localStorage 同步)。
 * - useGameStore:当前对局的公开状态(由 /sync 与实时频道更新)。
 */
import { create } from 'zustand';
import type { PublicGameState, PublicUser } from './types';
import { clearToken, getToken, setToken } from './api';

// ───────────────────────── 认证 store ─────────────────────────

interface AuthState {
  token: string | null;
  user: PublicUser | null;
  /** 是否已完成首次"恢复登录态"的尝试 */
  hydrated: boolean;
  /** 登录/注册成功:写入内存 + localStorage */
  signIn: (token: string, user: PublicUser) => void;
  /** 登出:清空内存 + localStorage */
  signOut: () => void;
  /** 仅更新用户信息(如筹码变化) */
  setUser: (user: PublicUser) => void;
  /** 标记已完成恢复尝试 */
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // 初始从 localStorage 读取 token(user 需要后续 /me 拉取)
  token: getToken(),
  user: null,
  hydrated: false,
  signIn: (token, user) => {
    setToken(token);
    set({ token, user });
  },
  signOut: () => {
    clearToken();
    set({ token: null, user: null });
  },
  setUser: (user) => set({ user }),
  setHydrated: () => set({ hydrated: true }),
}));

// ───────────────────────── 对局 store ─────────────────────────

interface GameState {
  /** 当前房间的对局公开状态 */
  state: PublicGameState | null;
  /** 实时连接状态(用于 UI 提示) */
  connection: 'idle' | 'connecting' | 'online' | 'offline';
  /** 整段替换对局状态(来自 /sync 或公共频道) */
  setState: (state: PublicGameState) => void;
  /**
   * 合并补丁:私有频道仅推送"本人手牌"等增量,
   * 这里按 userId 把可见手牌合并进现有玩家。
   */
  patchSelf: (patch: {
    userId: string;
    cards: PublicGameState['players'][number]['cards'];
  }) => void;
  setConnection: (c: GameState['connection']) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  state: null,
  connection: 'idle',
  setState: (state) => set({ state }),
  patchSelf: ({ userId, cards }) =>
    set((prev) => {
      if (!prev.state) return prev;
      return {
        state: {
          ...prev.state,
          players: prev.state.players.map((p) => (p.userId === userId ? { ...p, cards } : p)),
        },
      };
    }),
  setConnection: (connection) => set({ connection }),
  reset: () => set({ state: null, connection: 'idle' }),
}));
