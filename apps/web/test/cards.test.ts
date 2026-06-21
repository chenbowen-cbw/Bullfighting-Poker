import { describe, expect, it } from 'vitest';
import {
  NIU_LABEL,
  SUIT_SYMBOL,
  cardLabel,
  isRedSuit,
  isSpecialNiu,
  niuBadgeClass,
  rankLabel,
} from '../src/lib/client/cards';
import type { Rank } from '../src/lib/client/types';

describe('rankLabel', () => {
  it('把 A/J/Q/K 映射为字母,数字保持原样', () => {
    expect(rankLabel(1)).toBe('A');
    expect(rankLabel(11)).toBe('J');
    expect(rankLabel(12)).toBe('Q');
    expect(rankLabel(13)).toBe('K');
    for (let r = 2; r <= 10; r += 1) {
      expect(rankLabel(r as Rank)).toBe(String(r));
    }
  });
});

describe('isRedSuit', () => {
  it('红桃/方块为红,黑桃/梅花为黑', () => {
    expect(isRedSuit('H')).toBe(true);
    expect(isRedSuit('D')).toBe(true);
    expect(isRedSuit('S')).toBe(false);
    expect(isRedSuit('C')).toBe(false);
  });
});

describe('cardLabel', () => {
  it('生成中文无障碍文案', () => {
    expect(cardLabel({ suit: 'H', rank: 1 })).toBe('红桃A');
    expect(cardLabel({ suit: 'S', rank: 13 })).toBe('黑桃K');
    expect(cardLabel({ suit: 'D', rank: 10 })).toBe('方块10');
  });
});

describe('花色符号', () => {
  it('四种花色都有符号', () => {
    expect(SUIT_SYMBOL.S).toBe('♠');
    expect(SUIT_SYMBOL.H).toBe('♥');
    expect(SUIT_SYMBOL.C).toBe('♣');
    expect(SUIT_SYMBOL.D).toBe('♦');
  });
});

describe('牛型', () => {
  it('每种牛型都有中文标签', () => {
    expect(NIU_LABEL.NONE).toBe('没牛');
    expect(NIU_LABEL.NIU_NIU).toBe('牛牛');
    expect(NIU_LABEL.WU_XIAO_NIU).toBe('五小牛');
    expect(NIU_LABEL.BOMB).toBe('四炸');
  });

  it('特殊牌型判定正确', () => {
    expect(isSpecialNiu('NIU_NIU')).toBe(true);
    expect(isSpecialNiu('WU_HUA_NIU')).toBe(true);
    expect(isSpecialNiu('WU_XIAO_NIU')).toBe(true);
    expect(isSpecialNiu('BOMB')).toBe(true);
    expect(isSpecialNiu('NIU_5')).toBe(false);
    expect(isSpecialNiu('NONE')).toBe(false);
  });

  it('徽章配色对不同牛型返回非空类名', () => {
    expect(niuBadgeClass('NONE')).toContain('text-ink');
    expect(niuBadgeClass('NIU_NIU')).toContain('bg-bull');
    expect(niuBadgeClass('NIU_5')).toContain('bg-sunny');
    expect(niuBadgeClass('BOMB')).toContain('bg-grape');
  });
});
