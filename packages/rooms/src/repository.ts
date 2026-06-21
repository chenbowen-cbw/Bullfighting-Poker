import type { Room, RoomConfig, RoomStatus, Seat } from './types';

export interface CreateRoomData {
  roomCode: string;
  ownerId: string;
  config: RoomConfig;
}

export interface ListOpenFilter {
  baseScore?: number;
  limit: number;
  offset: number;
}

export interface AddSeatData {
  roomId: string;
  userId: string;
  seatNo: number;
  chipsIn: number;
}

/** 房间与座位存储抽象。Drizzle 实现与内存实现(测试)各自满足此接口。 */
export interface RoomRepository {
  createRoom(data: CreateRoomData): Promise<Room>;
  findById(id: string): Promise<Room | null>;
  findByCode(code: string): Promise<Room | null>;
  listOpen(filter: ListOpenFilter): Promise<Room[]>;
  updateStatus(id: string, status: RoomStatus): Promise<void>;
  transferOwner(id: string, newOwnerId: string): Promise<void>;

  listSeats(roomId: string): Promise<Seat[]>;
  findSeat(roomId: string, userId: string): Promise<Seat | null>;
  addSeat(data: AddSeatData): Promise<Seat>;
  removeSeat(roomId: string, userId: string): Promise<void>;
}

/** 内存实现,供单元测试使用(无需数据库) */
export class InMemoryRoomRepository implements RoomRepository {
  private readonly rooms = new Map<string, Room>();
  private readonly seats = new Map<string, Seat[]>();
  private seq = 0;

  async createRoom(data: CreateRoomData): Promise<Room> {
    this.seq += 1;
    const room: Room = {
      id: String(this.seq),
      roomCode: data.roomCode,
      name: data.config.name,
      ownerId: data.ownerId,
      baseScore: data.config.baseScore,
      maxPlayers: data.config.maxPlayers,
      mode: data.config.mode,
      minChips: data.config.minChips,
      status: 'waiting',
    };
    this.rooms.set(room.id, room);
    this.seats.set(room.id, []);
    return { ...room };
  }

  async findById(id: string): Promise<Room | null> {
    const room = this.rooms.get(id);
    return room ? { ...room } : null;
  }

  async findByCode(code: string): Promise<Room | null> {
    for (const room of this.rooms.values()) {
      if (room.roomCode === code) return { ...room };
    }
    return null;
  }

  async listOpen(filter: ListOpenFilter): Promise<Room[]> {
    const all = [...this.rooms.values()]
      .filter((r) => r.status === 'waiting')
      .filter((r) => filter.baseScore === undefined || r.baseScore === filter.baseScore)
      .sort((a, b) => Number(b.id) - Number(a.id));
    return all.slice(filter.offset, filter.offset + filter.limit).map((r) => ({ ...r }));
  }

  async updateStatus(id: string, status: RoomStatus): Promise<void> {
    const room = this.rooms.get(id);
    if (room) room.status = status;
  }

  async transferOwner(id: string, newOwnerId: string): Promise<void> {
    const room = this.rooms.get(id);
    if (room) room.ownerId = newOwnerId;
  }

  async listSeats(roomId: string): Promise<Seat[]> {
    return (this.seats.get(roomId) ?? []).map((s) => ({ ...s }));
  }

  async findSeat(roomId: string, userId: string): Promise<Seat | null> {
    const seat = (this.seats.get(roomId) ?? []).find((s) => s.userId === userId);
    return seat ? { ...seat } : null;
  }

  async addSeat(data: AddSeatData): Promise<Seat> {
    const seat: Seat = {
      roomId: data.roomId,
      userId: data.userId,
      seatNo: data.seatNo,
      status: 'sitting',
      chipsIn: data.chipsIn,
    };
    const list = this.seats.get(data.roomId) ?? [];
    list.push(seat);
    this.seats.set(data.roomId, list);
    return { ...seat };
  }

  async removeSeat(roomId: string, userId: string): Promise<void> {
    const list = this.seats.get(roomId) ?? [];
    this.seats.set(
      roomId,
      list.filter((s) => s.userId !== userId),
    );
  }
}
