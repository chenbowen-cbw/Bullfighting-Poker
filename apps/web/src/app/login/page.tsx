'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi, friendlyMessage } from '@/lib/client/api';
import { useAuthStore } from '@/lib/client/store';
import { useToast } from '@/components/ui/Toast';
import { AuthCard } from '@/components/auth/AuthCard';
import { CartoonButton } from '@/components/ui/CartoonButton';

/** 登录页:卡通表单。 */
export default function LoginPage() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const pushToast = useToast((s) => s.push);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { token, user } = await authApi.login({ username, password });
      signIn(token, user);
      pushToast('success', `欢迎回来,${user.nickname}!`);
      router.replace('/');
    } catch (err) {
      pushToast('error', friendlyMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="登录"
      subtitle="回到牌桌,继续斗牛 🐂"
      footer={
        <>
          还没有账号?{' '}
          <Link href="/register" className="font-extrabold text-tangerine underline">
            去注册
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="px-2 text-sm font-extrabold text-ink/70">用户名</span>
          <input
            className="input-cartoon"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="你的用户名"
            autoComplete="username"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="px-2 text-sm font-extrabold text-ink/70">密码</span>
          <input
            className="input-cartoon"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="你的密码"
            autoComplete="current-password"
            required
          />
        </label>
        <CartoonButton type="submit" variant="sunny" fullWidth loading={busy} className="mt-2">
          🎉 登录
        </CartoonButton>
      </form>
    </AuthCard>
  );
}
