import type { RoomRepository } from './repository';
import type { Room, RoomConfig, RoomWithSeats, Seat } from './types';
import { RoomError } from './errors';
import { generateRoomCode, type RandomFn } from './roomCode';

export interface RoomServiceConfig {
  /** 房间最少人数,默认 2 */
  minPlayers?: number;
  /** 房间最多人数,默认 10 */
  maxPlayersLimit?: number;
  /** 房间码长度,默认 6 */
  roomCodeLength?: number;
  /** 房间码生成尝试上限,默认 10 */
  roomCodeMaxAttempts?: number;
  /** 随机源,默认 Math.random(可注入以便测试) */
  rng?: RandomFn;
}

const NAME_MAX = 64;

/** 大厅/房间服务:房间生命周期与座位管理。依赖注入 RoomRepository。 */
export class RoomService {
  private readonly repo: RoomRepository;
  private readonly minPlayers: number;
  private readonly maxPlayersLimit: number;
  private readonly roomCodeLength: number;
  private readonly roomCodeMaxAttempts: number;
  private readonly rng: RandomFn;

  constructor(repo: RoomRepository, config: RoomServiceConfig = {}) {
    this.repo = repo;
    this.minPlayers = config.minPlayers ?? 2;
    this.maxPlayersLimit = config.maxPlayersLimit ?? 10;
    this.roomCodeLength = config.roomCodeLength ?? 6;
    this.roomCodeMaxAttempts = config.roomCodeMaxAttempts ?? 10;
    this.rng = config.rng ?? Math.random;
  }

  async createRoom(ownerId: string, config: RoomConfig, buyIn: number): Promise<RoomWithSeats> {
    this.validateConfig(config);
    if (buyIn < config.minChips) throw RoomError.insufficientChips();

    const roomCode = await this.generateUniqueCode();
    const room = await this.repo.createRoom({ roomCode, ownerId, config });
    const seat = await this.repo.addSeat({
      roomId: room.id,
      userId: ownerId,
      seatNo: 0,
      chipsIn: buyIn,
    });
    return { room, seats: [seat] };
  }

  async getRoom(id: string): Promise<RoomWithSeats> {
    const room = await this.repo.findById(id);
    if (!room) throw RoomError.notFound();
    const seats = await this.repo.listSeats(id);
    return { room, seats };
  }

  async listOpen(
    filter: { baseScore?: number; limit?: number; offset?: number } = {},
  ): Promise<Room[]> {
    const limit = Math.min(Math.max(filter.limit ?? 20, 1), 100);
    const offset = Math.max(filter.offset ?? 0, 0);
    return this.repo.listOpen({ baseScore: filter.baseScore, limit, offset });
  }

  async join(roomId: string, userId: string, chipsIn: number): Promise<RoomWithSeats> {
    const room = await this.repo.findById(roomId);
    if (!room) throw RoomError.notFound();
    if (room.status !== 'waiting') throw RoomError.notJoinable();
    if (chipsIn < room.minChips) throw RoomError.insufficientChips();

    const existing = await this.repo.findSeat(roomId, userId);
    if (existing) throw RoomError.alreadySeated();

    const seats = await this.repo.listSeats(roomId);
    if (seats.length >= room.maxPlayers) throw RoomError.full();

    const seatNo = lowestFreeSeat(seats, room.maxPlayers);
    await this.repo.addSeat({ roomId, userId, seatNo, chipsIn });
    return this.getRoom(roomId);
  }

  async leave(roomId: string, userId: string): Promise<{ room: Room; closed: boolean }> {
    const room = await this.repo.findById(roomId);
    if (!room) throw RoomError.notFound();
    const seat = await this.repo.findSeat(roomId, userId);
    if (!seat) throw RoomError.notSeated();

    await this.repo.removeSeat(roomId, userId);
    const remaining = await this.repo.listSeats(roomId);

    if (remaining.length === 0) {
      await this.repo.updateStatus(roomId, 'closed');
      return { room: { ...room, status: 'closed' }, closed: true };
    }

    if (room.ownerId === userId) {
      const newOwnerId = remaining[0].userId;
      await this.repo.transferOwner(roomId, newOwnerId);
      return { room: { ...room, ownerId: newOwnerId }, closed: false };
    }

    return { room, closed: false };
  }

  private validateConfig(config: RoomConfig): void {
    if (!config.name || config.name.length > NAME_MAX) {
      throw RoomError.invalidConfig(`房间名需为 1-${NAME_MAX} 字`);
    }
    if (!Number.isInteger(config.baseScore) || config.baseScore < 1) {
      throw RoomError.invalidConfig('底分需为 ≥1 的整数');
    }
    if (
      !Number.isInteger(config.maxPlayers) ||
      config.maxPlayers < this.minPlayers ||
      config.maxPlayers > this.maxPlayersLimit
    ) {
      throw RoomError.invalidConfig(`人数需为 ${this.minPlayers}-${this.maxPlayersLimit}`);
    }
    if (!Number.isInteger(config.minChips) || config.minChips < 0) {
      throw RoomError.invalidConfig('最低筹码需为 ≥0 的整数');
    }
    if (config.mode !== 'rob_banker') {
      throw RoomError.invalidConfig('暂仅支持抢庄斗牛');
    }
  }

  private async generateUniqueCode(): Promise<string> {
    for (let i = 0; i < this.roomCodeMaxAttempts; i += 1) {
      const code = generateRoomCode(this.roomCodeLength, this.rng);
      const exists = await this.repo.findByCode(code);
      if (!exists) return code;
    }
    throw RoomError.roomCodeExhausted();
  }
}

/** 返回最小的空座位号;满则抛 ROOM_FULL */
function lowestFreeSeat(seats: Seat[], maxPlayers: number): number {
  const occupied = new Set(seats.map((s) => s.seatNo));
  for (let i = 0; i < maxPlayers; i += 1) {
    if (!occupied.has(i)) return i;
  }
  throw RoomError.full();
}
