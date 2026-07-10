import dotenv from 'dotenv';
import path from 'path';
import { getDbConfig } from './dbUrl';

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export interface Config {
  port: number;
  nodeEnv: string;
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
  };
  testDb: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
  };
  admin: {
    username: string;
    password: string;
  };
  corsOrigin: string;
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  db: getDbConfig('DB'),
  testDb: getDbConfig('TEST_DB', 'DB'),
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '50', 10),
  },
};
