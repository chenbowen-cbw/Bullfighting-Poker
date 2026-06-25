/**
 * 游戏目录(Game Registry)类型定义。
 *
 * 门户首页消费一份静态 `GAMES` 列表渲染游戏卡片墙。
 * 未来新增游戏 = 往注册表里加一条,无需改动门户渲染逻辑。
 */

/** 上线状态:能不能玩 */
export type GameStatus = 'live' | 'coming-soon';

/**
 * 霓虹主题色(用 token 名而非 hex,卡片据此映射到对应 Tailwind 类)。
 * 对应 tailwind.config.ts 的 neon-* 令牌。
 */
export type GameAccent = 'cyan' | 'magenta' | 'yellow' | 'lime';

export interface GameEntry {
  /** 稳定唯一 id,也用作 URL 段:/games/{id} */
  id: string;
  /** 中文名(卡片主标题) */
  title: string;
  /** 英文/像素短名(卡片上方的像素大字) */
  subtitle: string;
  /** 一句话简介(≤ 24 字) */
  tagline: string;
  status: GameStatus;
  /** 霓虹主题色,驱动卡片边框/光晕 */
  accent: GameAccent;
  /** 玩法标签 chips */
  tags: string[];
  /** 人数范围 */
  players: { min: number; max: number };
  /**
   * 入口路由(仅 live 必填)。点卡片 CTA 后导航到此;
   * 未登录则跳 /login?redirect={entry}。
   */
  entry?: string;
  /** 封面图:public/ 下的同源资源(满足 CSP img-src 'self') */
  cover: string;
  /** 排序权重,越大越靠前;live 应高于 coming-soon */
  sort: number;
}
