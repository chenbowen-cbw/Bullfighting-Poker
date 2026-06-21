export default function HomePage() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '3rem', textAlign: 'center' }}>
      <h1>斗牛扑克 🐂</h1>
      <p>抢庄斗牛 · 在线卡牌游戏</p>
      <p style={{ color: '#888' }}>开发中 — M2 用户/认证</p>
      <p style={{ color: '#aaa', fontSize: '0.85rem' }}>
        API:<code>/api/auth/register</code> · <code>/api/auth/login</code> ·{' '}
        <code>/api/auth/me</code>
      </p>
    </main>
  );
}
