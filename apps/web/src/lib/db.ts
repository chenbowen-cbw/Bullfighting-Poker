import { createDb, type Database } from '@bullfighting/db';

let cached: Database | undefined;

/** 惰性创建数据库客户端(从环境变量读取连接串,避免构建期求值) */
export function getDb(): Database {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL 未配置');
    cached = createDb(url);
  }
  return cached;
}
