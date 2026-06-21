'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi, friendlyMessage } from '@/lib/client/api';
import { useAuthStore } from '@/lib/client/store';
import { useToast } from '@/components/ui/Toast';
import { AuthCard } from '@/components/auth/AuthCard';
import { CartoonButton } from '@/components/ui/CartoonButton';

/** 注册页:卡通表单。 */
export default function RegisterPage() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const pushToast = useToast((s) => s.push);

  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    // 简单的前端校验(与后端 zod 规则一致),即时给友好提示
    if (username.length < 3) {
      pushToast('error', '用户名至少 3 个字哦~');
      return;
    }
    if (password.length < 6) {
      pushToast('error', '密码至少 6 位,安全第一 🔒');
      return;
    }
    setBusy(true);
    try {
      const { token, user } = await authApi.register({
        username,
        password,
        nickname: nickname.trim() || undefined,
      });
      signIn(token, user);
      pushToast('success', `注册成功,欢迎加入,${user.nickname}!`);
      router.replace('/');
    } catch (err) {
      pushToast('error', friendlyMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="注册"
      subtitle="创建账号,免费领初始筹码 🪙"
      footer={
        <>
          已经有账号了?{' '}
          <Link href="/login" className="font-extrabold text-tangerine underline">
            去登录
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="px-2 text-sm font-extrabold text-ink/70">用户名(≥3 字)</span>
          <input
            className="input-cartoon"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="起个用户名"
            autoComplete="username"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="px-2 text-sm font-extrabold text-ink/70">昵称(可选)</span>
          <input
            className="input-cartoon"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="牌桌上的名字"
            maxLength={64}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="px-2 text-sm font-extrabold text-ink/70">密码(≥6 位)</span>
          <input
            className="input-cartoon"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="设置密码"
            autoComplete="new-password"
            required
          />
        </label>
        <CartoonButton type="submit" variant="tangerine" fullWidth loading={busy} className="mt-2">
          🐂 加入牌桌
        </CartoonButton>
      </form>
    </AuthCard>
  );
}
