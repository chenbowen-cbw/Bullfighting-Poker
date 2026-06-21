'use client';

import { useCallback, useEffect, useState } from 'react';
import { friendsApi, friendlyMessage } from '@/lib/client/api';
import type { FriendRequest, PublicFriend } from '@/lib/client/types';
import { useToast } from '@/components/ui/Toast';
import { CartoonButton } from '@/components/ui/CartoonButton';

interface FriendsPanelProps {
  /**
   * 提供则在每个好友右侧显示"邀请"按钮(房间内使用);
   * 返回 Promise 以便按钮显示加载态。
   */
  onInvite?: (friend: PublicFriend) => Promise<void>;
  /** 外部信号:数值变化时强制刷新列表(用于实时通知到达后联动) */
  refreshSignal?: number;
}

/**
 * 好友面板:好友列表(可邀请)+ 收到的好友请求(接受/拒绝)+ 添加好友。
 * 卡通风格,既可放进大厅抽屉,也可放进牌桌的邀请弹窗。
 */
export function FriendsPanel({ onInvite, refreshSignal }: FriendsPanelProps) {
  const pushToast = useToast((s) => s.push);

  const [friends, setFriends] = useState<PublicFriend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [sending, setSending] = useState(false);
  /** 正在处理中的条目 id(请求 id 或好友 id),用于按钮加载态 */
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [{ friends }, requests] = await Promise.all([
        friendsApi.listFriends(),
        friendsApi.listRequests(),
      ]);
      setFriends(friends);
      setIncoming(requests.incoming);
      setOutgoing(requests.outgoing);
    } catch (err) {
      pushToast('error', friendlyMessage(err));
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshSignal]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = username.trim();
    if (!name || sending) return;
    setSending(true);
    try {
      await friendsApi.sendRequest(name);
      pushToast('success', `已向 ${name} 发送好友请求`);
      setUsername('');
      await refresh();
    } catch (err) {
      pushToast('error', friendlyMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function handleAccept(req: FriendRequest) {
    if (busyId) return;
    setBusyId(req.id);
    try {
      await friendsApi.accept(req.id);
      pushToast('success', `已和 ${req.user.nickname} 成为好友 🎉`);
      await refresh();
    } catch (err) {
      pushToast('error', friendlyMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(req: FriendRequest) {
    if (busyId) return;
    setBusyId(req.id);
    try {
      await friendsApi.reject(req.id);
      await refresh();
    } catch (err) {
      pushToast('error', friendlyMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(friend: PublicFriend) {
    if (busyId) return;
    setBusyId(friend.id);
    try {
      await friendsApi.remove(friend.id);
      await refresh();
    } catch (err) {
      pushToast('error', friendlyMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleInvite(friend: PublicFriend) {
    if (!onInvite || busyId) return;
    setBusyId(friend.id);
    try {
      await onInvite(friend);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 添加好友 */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="输入用户名添加好友"
          maxLength={32}
          className="input-cartoon flex-1"
        />
        <CartoonButton type="submit" variant="grass" loading={sending}>
          添加
        </CartoonButton>
      </form>

      {/* 收到的请求 */}
      {incoming.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-extrabold text-ink/70">📨 好友请求</h3>
          <ul className="flex flex-col gap-2">
            {incoming.map((req) => (
              <li
                key={req.id}
                className="badge-cartoon flex items-center justify-between bg-sunny/40 px-3 py-2"
              >
                <span className="truncate font-bold text-ink">
                  {req.user.nickname}
                  <span className="ml-1 text-xs text-ink/50">@{req.user.username}</span>
                </span>
                <span className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleAccept(req)}
                    disabled={busyId === req.id}
                    className="btn-cartoon bg-grass px-3 py-1 text-xs text-chalk"
                  >
                    接受
                  </button>
                  <button
                    onClick={() => handleReject(req)}
                    disabled={busyId === req.id}
                    className="btn-cartoon bg-chalk px-3 py-1 text-xs text-ink"
                  >
                    拒绝
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 好友列表 */}
      <section>
        <h3 className="mb-2 text-sm font-extrabold text-ink/70">
          🐂 我的好友 {friends.length > 0 && `(${friends.length})`}
        </h3>
        {loading ? (
          <p className="py-6 text-center text-sm font-bold text-ink/50">加载中…</p>
        ) : friends.length === 0 ? (
          <p className="py-6 text-center text-sm font-bold text-ink/50">还没有好友,快去添加吧~</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {friends.map((friend) => (
              <li
                key={friend.id}
                className="badge-cartoon flex items-center justify-between bg-chalk px-3 py-2"
              >
                <span className="truncate font-bold text-ink">
                  {friend.nickname}
                  <span className="ml-1 text-xs text-ink/50">@{friend.username}</span>
                </span>
                <span className="flex shrink-0 gap-2">
                  {onInvite && (
                    <button
                      onClick={() => handleInvite(friend)}
                      disabled={busyId === friend.id}
                      className="btn-cartoon bg-tangerine px-3 py-1 text-xs text-chalk"
                    >
                      邀请
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(friend)}
                    disabled={busyId === friend.id}
                    className="btn-cartoon bg-bull px-3 py-1 text-xs text-chalk"
                  >
                    删除
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 已发出的请求(只读提示) */}
      {outgoing.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-extrabold text-ink/70">⏳ 等待对方同意</h3>
          <ul className="flex flex-wrap gap-2">
            {outgoing.map((req) => (
              <li
                key={req.id}
                className="badge-cartoon bg-grape/20 px-3 py-1 text-xs font-bold text-ink/70"
              >
                {req.user.nickname}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
