import { describe, it, expect } from 'vitest';
import { generateRoomCode, ROOM_CODE_ALPHABET } from '../src/roomCode';

describe('generateRoomCode', () => {
  it('生成指定长度、且全部来自字母表的码', () => {
    const code = generateRoomCode(6, () => 0.5);
    expect(code).toHaveLength(6);
    for (const ch of code) expect(ROOM_CODE_ALPHABET).toContain(ch);
  });

  it('不含易混淆字符 0/O/1/I', () => {
    expect(ROOM_CODE_ALPHABET).not.toMatch(/[01OI]/);
  });

  it('注入相同 rng 序列时结果可复现', () => {
    const makeRng = () => {
      const seq = [0, 0.99, 0.5, 0.1, 0.7, 0.3];
      let i = 0;
      return () => seq[i++ % seq.length];
    };
    expect(generateRoomCode(6, makeRng())).toBe(generateRoomCode(6, makeRng()));
  });
});
