import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

/**
 * 在 Node 运行时为 Neon 的 WebSocket 驱动注入 ws 构造器。
 *
 * 浏览器/Edge 自带 WebSocket;仅 Node(Serverless Functions, runtime='nodejs')
 * 需要这一步。模块级只设置一次即可。
 */
if (typeof neonConfig.webSocketConstructor === 'undefined') {
  // ws 的类型与浏览器 WebSocket 接口不完全一致,这里按 Neon 文档约定赋值。
  neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
}

/** 基于连接池的 Drizzle 客户端(支持多语句事务) */
export type PooledDatabase = NeonDatabase<typeof schema>;

/** 事务句柄类型(从 db.transaction 回调参数推导,避免深层路径导入) */
export type PooledTransaction = Parameters<Parameters<PooledDatabase['transaction']>[0]>[0];

/** 连接池 + Drizzle 客户端句柄;用完务必调用 pool.end() 释放连接 */
export interface PooledConnection {
  pool: Pool;
  db: PooledDatabase;
}

/**
 * 用 Neon 的 WebSocket Pool 驱动(neon-serverless)创建支持事务的 Drizzle 客户端。
 *
 * 与 HTTP 驱动(createDb)不同,Pool 驱动可在单个会话内跑多语句事务
 * (db.transaction(...))。注意:在 Serverless 环境中每次调用应**新建并随后
 * 关闭**连接池,切勿跨请求复用,否则可能泄漏 WebSocket 连接。
 */
export function createPooledDb(connectionString: string): PooledConnection {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return { pool, db };
}
