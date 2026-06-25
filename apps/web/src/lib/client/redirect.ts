/**
 * 从当前 URL 读取 `redirect` 查询参数,仅放行站内同源相对路径,回跳安全。
 * - 必须以单个 '/' 开头(排除 '//evil.com' 这类协议相对 URL 的开放重定向);
 * - 在客户端提交时调用(读 window.location),避免 useSearchParams 的 Suspense 约束。
 */
export function safeRedirect(fallback = '/'): string {
  if (typeof window === 'undefined') return fallback;
  const r = new URLSearchParams(window.location.search).get('redirect');
  if (r && r.startsWith('/') && !r.startsWith('//')) return r;
  return fallback;
}
