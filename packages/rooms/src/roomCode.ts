/** 房间码字母表(去除易混淆的 0/O/1/I) */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type RandomFn = () => number;

/** 生成随机房间码。rng 可注入以便测试。 */
export function generateRoomCode(length = 6, rng: RandomFn = Math.random): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += ROOM_CODE_ALPHABET[Math.floor(rng() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}
