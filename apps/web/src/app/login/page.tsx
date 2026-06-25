'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi, friendlyMessage } from '@/lib/client/api';
import { safeRedirect } from '@/lib/client/redirect';
import { useAuthStore } from '@/lib/client/store';
import { useToast } from '@/components/ui/Toast';
import { AuthCard } from '@/components/auth/AuthCard';
import { PixelButton } from '@/components/home/PixelButton';

/** 登录页:暗黑像素表单。 */
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
      router.replace(safeRedirect());
    } catch (err) {
      pushToast('error', friendlyMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      kicker="LOGIN"
      title="登录"
      subtitle="回到牌桌,继续开玩"
      footer={
        <>
          还没有账号?{' '}
          <Link href="/register" className="font-bold text-neon-cyan underline">
            去注册
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="px-1 font-pixel-body text-base text-pixel-dim">用户名</span>
          <input
            className="input-pixel"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="你的用户名"
            autoComplete="username"
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="px-1 font-pixel-body text-base text-pixel-dim">密码</span>
          <input
            className="input-pixel"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="你的密码"
            autoComplete="current-password"
            required
          />
        </label>
        <PixelButton type="submit" solid fullWidth loading={busy} className="mt-3">
          ▶ 登录
        </PixelButton>
      </form>
    </AuthCard>
  );
}
