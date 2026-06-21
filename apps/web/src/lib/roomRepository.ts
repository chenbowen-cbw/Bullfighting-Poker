import { and, desc, eq } from 'drizzle-orm';
import { rooms, roomSeats, type Database } from '@bullfighting/db';
import type {
  AddSeatData,
  CreateRoomData,
  ListOpenFilter,
  Room,
  RoomMode,
  RoomRepository,
  RoomStatus,
  Seat,
  SeatStatus,
} from '@bullfighting/rooms';

type RoomRow = typeof rooms.$inferSelect;
type SeatRow = typeof roomSeats.$inferSelect;

/** RoomRepository 的 Drizzle 实现 */
export class DrizzleRoomRepository implements RoomRepository {
  constructor(private readonly db: Database) {}

  async createRoom(data: CreateRoomData): Promise<Room> {
    const [row] = await this.db
      .insert(rooms)
      .values({
        roomCode: data.roomCode,
        name: data.config.name,
        ownerId: Number(data.ownerId),
        baseScore: data.config.baseScore,
        maxPlayers: data.config.maxPlayers,
        mode: data.config.mode,
        minChips: data.config.minChips,
        status: 'waiting',
      })
      .returning();
    return toRoom(row);
  }

  async findById(id: string): Promise<Room | null> {
    const [row] = await this.db
      .select()
      .from(rooms)
      .where(eq(rooms.id, Number(id)))
      .limit(1);
    return row ? toRoom(row) : null;
  }

  async findByCode(code: string): Promise<Room | null> {
    const [row] = await this.db.select().from(rooms).where(eq(rooms.roomCode, code)).limit(1);
    return row ? toRoom(row) : null;
  }

  async listOpen(filter: ListOpenFilter): Promise<Room[]> {
    const conditions = [eq(rooms.status, 'waiting')];
    if (filter.baseScore !== undefined) conditions.push(eq(rooms.baseScore, filter.baseScore));
    const rowsResult = await this.db
      .select()
      .from(rooms)
      .where(and(...conditions))
      .orderBy(desc(rooms.id))
      .limit(filter.limit)
      .offset(filter.offset);
    return rowsResult.map(toRoom);
  }

  async updateStatus(id: string, status: RoomStatus): Promise<void> {
    await this.db
      .update(rooms)
      .set({ status })
      .where(eq(rooms.id, Number(id)));
  }

  async transferOwner(id: string, newOwnerId: string): Promise<void> {
    await this.db
      .update(rooms)
      .set({ ownerId: Number(newOwnerId) })
      .where(eq(rooms.id, Number(id)));
  }

  async listSeats(roomId: string): Promise<Seat[]> {
    const rowsResult = await this.db
      .select()
      .from(roomSeats)
      .where(eq(roomSeats.roomId, Number(roomId)))
      .orderBy(roomSeats.seatNo);
    return rowsResult.map(toSeat);
  }

  async findSeat(roomId: string, userId: string): Promise<Seat | null> {
    const [row] = await this.db
      .select()
      .from(roomSeats)
      .where(and(eq(roomSeats.roomId, Number(roomId)), eq(roomSeats.userId, Number(userId))))
      .limit(1);
    return row ? toSeat(row) : null;
  }

  async addSeat(data: AddSeatData): Promise<Seat> {
    const [row] = await this.db
      .insert(roomSeats)
      .values({
        roomId: Number(data.roomId),
        userId: Number(data.userId),
        seatNo: data.seatNo,
        chipsIn: data.chipsIn,
        status: 'sitting',
      })
      .returning();
    return toSeat(row);
  }

  async removeSeat(roomId: string, userId: string): Promise<void> {
    await this.db
      .delete(roomSeats)
      .where(and(eq(roomSeats.roomId, Number(roomId)), eq(roomSeats.userId, Number(userId))));
  }
}

function toRoom(row: RoomRow): Room {
  return {
    id: String(row.id),
    roomCode: row.roomCode,
    name: row.name,
    ownerId: String(row.ownerId),
    baseScore: row.baseScore,
    maxPlayers: row.maxPlayers,
    mode: row.mode as RoomMode,
    minChips: row.minChips,
    status: row.status as RoomStatus,
  };
}

function toSeat(row: SeatRow): Seat {
  return {
    roomId: String(row.roomId),
    userId: String(row.userId),
    seatNo: row.seatNo,
    status: row.status as SeatStatus,
    chipsIn: row.chipsIn,
  };
}
