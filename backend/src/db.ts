import mysql, { Pool, PoolOptions, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { config } from './config';

let pool: Pool | null = null;

export function getPool(dbConfig?: { host: string; port: number; user: string; password: string; name: string }): Pool {
  if (pool) return pool;

  const db = dbConfig || config.db;

  const poolOptions: PoolOptions = {
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: db.name,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };

  pool = mysql.createPool(poolOptions);
  return pool;
}

export function setPool(newPool: Pool): void {
  pool = newPool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function query<T extends RowDataPacket[]>(sql: string, params?: any[]): Promise<T> {
  const p = getPool();
  const [rows] = await p.execute<T>(sql, params || []);
  return rows;
}

export async function execute(sql: string, params?: any[]): Promise<ResultSetHeader> {
  const p = getPool();
  const [result] = await p.execute<ResultSetHeader>(sql, params || []);
  return result;
}

// Re-export types for convenience
export type { RowDataPacket, ResultSetHeader };
