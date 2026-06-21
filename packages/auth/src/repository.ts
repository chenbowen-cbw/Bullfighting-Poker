import type { AuthUserRecord, CreateUserInput } from './types';

/** 用户存储抽象。数据层实现(Drizzle)与内存实现(测试)各自满足此接口。 */
export interface UserRepository {
  findByUsername(username: string): Promise<AuthUserRecord | null>;
  findById(id: string): Promise<AuthUserRecord | null>;
  create(input: CreateUserInput): Promise<AuthUserRecord>;
}

/** 内存实现,供单元测试使用(无需数据库) */
export class InMemoryUserRepository implements UserRepository {
  private readonly byId = new Map<string, AuthUserRecord>();
  private readonly byUsername = new Map<string, AuthUserRecord>();
  private seq = 0;

  async findByUsername(username: string): Promise<AuthUserRecord | null> {
    return this.byUsername.get(username.toLowerCase()) ?? null;
  }

  async findById(id: string): Promise<AuthUserRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async create(input: CreateUserInput): Promise<AuthUserRecord> {
    this.seq += 1;
    const record: AuthUserRecord = {
      id: String(this.seq),
      username: input.username,
      passwordHash: input.passwordHash,
      nickname: input.nickname,
      chips: input.chips,
      status: 'active',
    };
    this.byId.set(record.id, record);
    this.byUsername.set(record.username.toLowerCase(), record);
    return record;
  }
}
