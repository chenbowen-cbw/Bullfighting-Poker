import type { GameEntry } from './types';

/**
 * 平台游戏目录。新增游戏只需在此追加一条,门户首页会自动渲染。
 *
 * 当前:抢庄斗牛已上线(live);德州扑克、跑得快为占位(coming-soon),
 * 用于体现「多游戏平台」的定位。
 */
export const GAMES: GameEntry[] = [
  {
    id: 'bullfighting',
    title: '抢庄斗牛',
    subtitle: 'BULL FIGHT',
    tagline: '抢庄、比牛,一把定输赢',
    status: 'live',
    accent: 'cyan',
    tags: ['2-5人', '抢庄', '快节奏'],
    players: { min: 2, max: 5 },
    entry: '/games/bullfighting',
    cover: '/games/bullfighting.svg',
    sort: 100,
  },
  {
    id: 'texas',
    title: '德州扑克',
    subtitle: "TEXAS HOLD'EM",
    tagline: '下注、诈唬、All-in 博弈',
    status: 'coming-soon',
    accent: 'magenta',
    tags: ['2-9人', '下注博弈'],
    players: { min: 2, max: 9 },
    cover: '/games/texas.svg',
    sort: 50,
  },
  {
    id: 'run-fast',
    title: '跑得快',
    subtitle: 'RUN FAST',
    tagline: '出完手牌就赢,节奏飞快',
    status: 'coming-soon',
    accent: 'yellow',
    tags: ['3人', '甩牌', '轻竞技'],
    players: { min: 3, max: 3 },
    cover: '/games/run-fast.svg',
    sort: 40,
  },
];

/** 仅 live 游戏 */
export const liveGames = (): GameEntry[] => GAMES.filter((g) => g.status === 'live');

/** 按 sort 降序(live 在前) */
export const sortedGames = (): GameEntry[] => [...GAMES].sort((a, b) => b.sort - a.sort);

/** 按 id 查找 */
export const getGame = (id: string): GameEntry | undefined => GAMES.find((g) => g.id === id);
