import {Pool, QueryResult, QueryResultRow} from 'pg';
import {env} from '../config/env';

/**
 * PostgreSQL 连接池
 *
 * 使用 pg.Pool 管理数据库连接。
 * 生产环境应使用连接池配置进行微调。
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

/**
 * 执行查询的辅助函数
 * 自动处理客户端获取与释放。
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[],
): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    return await client.query<T>(text, params);
  } finally {
    client.release();
  }
}

/**
 * 测试数据库连接
 */
export async function testConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

// 进程退出时关闭连接池
process.on('SIGTERM', async () => {
  await pool.end();
});

process.on('SIGINT', async () => {
  await pool.end();
});
