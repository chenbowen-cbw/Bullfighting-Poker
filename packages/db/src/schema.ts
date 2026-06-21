import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  text,
  integer,
  smallint,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

/** 用户与筹码余额 */
export const users = pgTable(
  'users',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    username: varchar('username', { length: 32 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    nickname: varchar('nickname', { length: 64 }).notNull(),
    avatarUrl: text('avatar_url'),
    chips: bigint('chips', { mode: 'number' }).notNull().default(0),
    status: varchar('status', { length: 16 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_username_uniq').on(t.username)],
);

/** 个人统计 */
export const userStats = pgTable('user_stats', {
  userId: bigint('user_id', { mode: 'number' })
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  roundsPlayed: integer('rounds_played').notNull().default(0),
  roundsWon: integer('rounds_won').notNull().default(0),
  bankerRounds: integer('banker_rounds').notNull().default(0),
  totalWon: bigint('total_won', { mode: 'number' }).notNull().default(0),
  totalLost: bigint('total_lost', { mode: 'number' }).notNull().default(0),
  biggestWin: bigint('biggest_win', { mode: 'number' }).notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** 房间与配置 */
export const rooms = pgTable(
  'rooms',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    roomCode: varchar('room_code', { length: 12 }).notNull(),
    name: varchar('name', { length: 64 }).notNull(),
    ownerId: bigint('owner_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    baseScore: integer('base_score').notNull().default(1),
    maxPlayers: smallint('max_players').notNull().default(6),
    mode: varchar('mode', { length: 24 }).notNull().default('rob_banker'),
    minChips: bigint('min_chips', { mode: 'number' }).notNull().default(0),
    status: varchar('status', { length: 16 }).notNull().default('waiting'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('rooms_room_code_uniq').on(t.roomCode),
    index('rooms_status_idx').on(t.status),
  ],
);

/** 座位 / 在座玩家 */
export const roomSeats = pgTable(
  'room_seats',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    roomId: bigint('room_id', { mode: 'number' })
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    seatNo: smallint('seat_no').notNull(),
    status: varchar('status', { length: 16 }).notNull().default('sitting'),
    chipsIn: bigint('chips_in', { mode: 'number' }).notNull().default(0),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('room_seats_room_seat_uniq').on(t.roomId, t.seatNo)],
);

/** 每一局 */
export const rounds = pgTable(
  'rounds',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    roomId: bigint('room_id', { mode: 'number' })
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    roundNo: integer('round_no').notNull(),
    bankerUserId: bigint('banker_user_id', { mode: 'number' }).references(() => users.id),
    shuffleSeed: text('shuffle_seed'),
    shuffleProof: text('shuffle_proof'),
    phase: varchar('phase', { length: 24 }).notNull().default('waiting'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (t) => [index('rounds_room_idx').on(t.roomId)],
);

/** 局内每玩家结果 */
export const roundPlayers = pgTable(
  'round_players',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    roundId: bigint('round_id', { mode: 'number' })
      .notNull()
      .references(() => rounds.id, { onDelete: 'cascade' }),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    seatNo: smallint('seat_no').notNull(),
    cards: jsonb('cards'),
    niuType: varchar('niu_type', { length: 16 }),
    niuValue: smallint('niu_value'),
    isBanker: boolean('is_banker').notNull().default(false),
    betMultiplier: integer('bet_multiplier').notNull().default(1),
    robMultiplier: integer('rob_multiplier').notNull().default(1),
    resultChips: bigint('result_chips', { mode: 'number' }).notNull().default(0),
  },
  (t) => [index('round_players_round_idx').on(t.roundId)],
);

/** 筹码账本(审计 / 对账) */
export const transactions = pgTable(
  'transactions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    roundId: bigint('round_id', { mode: 'number' }).references(() => rounds.id),
    type: varchar('type', { length: 24 }).notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    balanceAfter: bigint('balance_after', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('transactions_user_idx').on(t.userId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Room = typeof rooms.$inferSelect;
export type Round = typeof rounds.$inferSelect;
export type RoundPlayer = typeof roundPlayers.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
