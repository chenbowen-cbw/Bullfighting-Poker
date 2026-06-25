import { describe, expect, it } from 'vitest';
import { GAMES, getGame, liveGames, sortedGames } from '../src/lib/games/registry';

describe('游戏注册表', () => {
  it('斗牛为 live 且配置了入口路由', () => {
    const bull = getGame('bullfighting');
    expect(bull?.status).toBe('live');
    expect(bull?.entry).toBe('/games/bullfighting');
  });

  it('每个 live 游戏必须有 entry 入口', () => {
    for (const g of liveGames()) {
      expect(g.entry, `${g.id} 缺少 entry`).toBeTruthy();
    }
  });

  it('sortedGames 按 sort 降序,且 live 排在最前', () => {
    const sorted = sortedGames();
    const sorts = sorted.map((g) => g.sort);
    expect(sorts).toEqual([...sorts].sort((a, b) => b - a));
    expect(sorted[0]?.status).toBe('live');
  });

  it('游戏 id 唯一', () => {
    const ids = GAMES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('封面均为同源相对路径(满足 CSP img-src self)', () => {
    for (const g of GAMES) {
      expect(g.cover.startsWith('/'), `${g.id} 封面非同源路径`).toBe(true);
    }
  });
});
