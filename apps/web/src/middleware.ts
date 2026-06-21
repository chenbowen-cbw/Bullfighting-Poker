import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 安全响应头中间件。
 *
 * 统一为所有响应注入安全相关的 HTTP 头,降低 XSS、点击劫持、MIME 嗅探等风险。
 * 安全头集中在此处维护,避免与 next.config.mjs 的前端配置耦合冲突。
 *
 * 说明:
 * - 本应用为纯 API + 极简前端,默认采用较严格的 CSP。
 *   若后续引入第三方脚本(如 Ably CDN、统计 SDK),请在此处放开对应来源,
 *   或改为基于 nonce 的 CSP。
 * - Ably 走 WebSocket(wss),已在 connect-src 放行。
 */

/** 构造内容安全策略(CSP)字符串 */
function buildCsp(): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    // Next.js 运行时在开发模式需要 'unsafe-eval';生产构建不需要。
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    // 允许同源 API 与 Ably 实时连接(REST + WebSocket)
    'connect-src': ["'self'", 'https:', 'wss:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

const SECURITY_HEADERS: Record<string, string> = {
  // 禁止浏览器基于内容猜测 MIME 类型
  'X-Content-Type-Options': 'nosniff',
  // 禁止被任意站点以 frame/iframe 嵌入(防点击劫持)
  'X-Frame-Options': 'DENY',
  // 控制 Referer 头的泄露范围
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // 关闭一批默认不需要的浏览器特性
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  // 跨域开窗隔离(缓解部分跨站信息泄露)
  'Cross-Origin-Opener-Policy': 'same-origin',
  // 仅在生产强制 HTTPS;预览/本地不下发,避免本地调试被 HSTS 粘住
  // HSTS 在下方根据环境按需追加
  'Content-Security-Policy': buildCsp(),
};

export function middleware(req: NextRequest): NextResponse {
  const res = NextResponse.next();

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(name, value);
  }

  // 仅当通过 HTTPS 访问时下发 HSTS(生产环境),避免污染本地 http 调试
  if (req.nextUrl.protocol === 'https:') {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  return res;
}

/**
 * 匹配范围:除 Next 静态资源与 favicon 外的所有路径。
 * 这样 API 与页面都会带上安全头,而 _next/static 等无需处理。
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
