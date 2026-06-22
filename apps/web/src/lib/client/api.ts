/**
 * 浏览器端 API 客户端。
 *
 * - 自动携带 localStorage 中的 JWT(register/login 除外)。
 * - 统一错误处理:把后端 { error, code } 或网络异常包装成友好的 ApiError。
 * - 全部为运行时 fetch,绝不在构建期触达后端/环境变量。
 */
import type {
  AuthResult,
  FriendRequests,
  PublicFriend,
  PublicGameState,
  PublicUser,
  QuickMatchResult,
  RoomWithSeats,
  Room,
} from './types';

const TOKEN_KEY = 'bf_token';

// ───────────────────────── 令牌存取 ─────────────────────────

/** 读取本地 JWT(SSR 安全:服务端返回 null) */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

/** 写入本地 JWT */
export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

/** 清除本地 JWT(登出) */
export function clearToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

// ───────────────────────── 错误类型 ─────────────────────────

/** 统一的 API 错误,携带 HTTP 状态与稳定错误码 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  /** 是否为"对局后端尚未上线"(404/405,接口缺失) */
  get isBackendMissing(): boolean {
    return this.status === 404 || this.status === 405;
  }
}

/** 把任意错误转成可直接展示给玩家的中文文案 */
export function friendlyMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return '登录已过期,请重新登录~';
    if (err.status === 0) return '网络开小差了,检查下网络再试试 🐂';
    return err.message || '出了点小问题,稍后再试';
  }
  if (err instanceof Error) return err.message;
  return '未知错误';
}

// ───────────────────────── 底层请求 ─────────────────────────

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** 是否附带 Authorization 头(默认 true) */
  auth?: boolean;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      cache: 'no-store',
    });
  } catch (err) {
    // 网络层失败(断网/CORS/被中断)
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError('网络连接失败', 0);
  }

  // 解析响应体(可能是 JSON,也可能为空)
  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const payload = (data ?? {}) as { error?: string; code?: string };
    throw new ApiError(payload.error ?? `请求失败(${res.status})`, res.status, payload.code);
  }

  return data as T;
}

// ───────────────────────── 认证 ─────────────────────────

export const authApi = {
  register(input: { username: string; password: string; nickname?: string }): Promise<AuthResult> {
    return request<AuthResult>('/api/auth/register', { method: 'POST', body: input, auth: false });
  },
  login(input: { username: string; password: string }): Promise<AuthResult> {
    return request<AuthResult>('/api/auth/login', { method: 'POST', body: input, auth: false });
  },
  me(): Promise<{ user: PublicUser }> {
    return request<{ user: PublicUser }>('/api/auth/me');
  },
};

// ───────────────────────── 房间 / 大厅 ─────────────────────────

export const roomApi = {
  list(baseScore?: number): Promise<{ rooms: Room[] }> {
    const qs = baseScore ? `?baseScore=${baseScore}` : '';
    return request<{ rooms: Room[] }>(`/api/rooms${qs}`);
  },
  create(input: {
    name: string;
    baseScore: number;
    maxPlayers: number;
    minChips?: number;
    buyIn?: number;
  }): Promise<RoomWithSeats> {
    return request<RoomWithSeats>('/api/rooms', {
      method: 'POST',
      body: { mode: 'rob_banker', ...input },
    });
  },
  get(id: string): Promise<RoomWithSeats> {
    return request<RoomWithSeats>(`/api/rooms/${id}`);
  },
  join(id: string, chipsIn = 0): Promise<RoomWithSeats> {
    return request<RoomWithSeats>(`/api/rooms/${id}/join`, { method: 'POST', body: { chipsIn } });
  },
  leave(id: string): Promise<{ room: Room; closed: boolean }> {
    return request<{ room: Room; closed: boolean }>(`/api/rooms/${id}/leave`, { method: 'POST' });
  },
  quickMatch(baseScore: number): Promise<QuickMatchResult> {
    return request<QuickMatchResult>('/api/matchmaking/quick', {
      method: 'POST',
      body: { baseScore },
    });
  },
};

// ───────────────────────── 好友 ─────────────────────────

export const friendsApi = {
  /** 我的好友列表 */
  listFriends(): Promise<{ friends: PublicFriend[] }> {
    return request<{ friends: PublicFriend[] }>('/api/friends');
  },
  /** 待处理请求(收/发) */
  listRequests(): Promise<FriendRequests> {
    return request<FriendRequests>('/api/friends/requests');
  },
  /** 按用户名发起好友请求 */
  sendRequest(toUsername: string): Promise<{ request: { id: string; status: string } }> {
    return request('/api/friends/requests', { method: 'POST', body: { toUsername } });
  },
  /** 接受请求 */
  accept(requestId: string): Promise<{ friendship: { id: string; status: string } }> {
    return request(`/api/friends/requests/${requestId}/accept`, { method: 'POST' });
  },
  /** 拒绝请求 */
  reject(requestId: string): Promise<{ ok: true }> {
    return request(`/api/friends/requests/${requestId}/reject`, { method: 'POST' });
  },
  /** 删除好友 */
  remove(friendId: string): Promise<{ ok: true }> {
    return request(`/api/friends/${friendId}`, { method: 'DELETE' });
  },
  /** 邀请好友进入指定房间 */
  invite(friendId: string, roomId: string): Promise<{ ok: true }> {
    return request(`/api/friends/${friendId}/invite`, { method: 'POST', body: { roomId } });
  },
};

// ───────────────────────── 对局(M4/M5 后端上线后生效) ─────────────────────────

/**
 * Ably TokenRequest(由 ably 客户端 authCallback 使用)。
 * 字段形状遵循 Ably 规范,这里用宽松类型避免与具体版本耦合。
 */
export type AblyTokenRequest = Record<string, unknown>;

export const gameApi = {
  /** 拉取对局公开状态(进入房间时的初始态) */
  sync(roomId: string, signal?: AbortSignal): Promise<PublicGameState> {
    return request<PublicGameState>(`/api/game/${roomId}/sync`, { signal });
  },
  start(roomId: string): Promise<PublicGameState> {
    return request<PublicGameState>(`/api/game/${roomId}/start`, { method: 'POST' });
  },
  robBanker(roomId: string, multiplier: number): Promise<PublicGameState> {
    return request<PublicGameState>(`/api/game/${roomId}/rob-banker`, {
      method: 'POST',
      body: { multiplier },
    });
  },
  bet(roomId: string, multiplier: number): Promise<PublicGameState> {
    return request<PublicGameState>(`/api/game/${roomId}/bet`, {
      method: 'POST',
      body: { multiplier },
    });
  },
  reveal(roomId: string): Promise<PublicGameState> {
    return request<PublicGameState>(`/api/game/${roomId}/reveal`, { method: 'POST', body: {} });
  },
  /**
   * 获取浏览器订阅用的 Ably TokenRequest。
   * 传入 roomId 时,令牌能力会额外覆盖 `room:{roomId}` 与本人私有手牌频道;
   * 不传则仅覆盖本人通知频道 `user:{id}`。
   */
  realtimeToken(roomId?: string | null): Promise<AblyTokenRequest> {
    const qs = roomId ? `?roomId=${encodeURIComponent(roomId)}` : '';
    return request<AblyTokenRequest>(`/api/realtime/token${qs}`);
  },
};

// ───────────────────────── 人机练习(PvE) ─────────────────────────

/** 人机练习开局参数 */
export interface StartPveInput {
  difficulty: 'easy' | 'medium' | 'hard';
  botCount: number;
  baseScore: number;
}

export const pveApi = {
  /** 开一局人机练习,返回 roomId 与初始公开状态 */
  start(opts: StartPveInput): Promise<{ roomId: string; state: PublicGameState }> {
    return request<{ roomId: string; state: PublicGameState }>('/api/pve/start', {
      method: 'POST',
      body: opts,
    });
  },
  /** 同一练习房开下一局 */
  nextRound(roomId: string): Promise<PublicGameState> {
    return request<PublicGameState>(`/api/pve/${roomId}/next-round`, { method: 'POST', body: {} });
  },
};
