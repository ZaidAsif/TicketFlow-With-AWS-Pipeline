import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { parseDatabaseUrl } from '../src/dbUrl';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runSeed() {
  const parsedUrl = parseDatabaseUrl(process.env.DATABASE_URL || '');
  
  const connection = await mysql.createConnection({
    host: parsedUrl?.host || process.env.DB_HOST || '127.0.0.1',
    port: parsedUrl?.port || parseInt(process.env.DB_PORT || '3306', 10),
    user: parsedUrl?.user || process.env.DB_USER || 'root',
    password: parsedUrl?.password || process.env.DB_PASSWORD || '',
    database: parsedUrl?.database || process.env.DB_NAME || 'ticket_system',
    multipleStatements: true,
  });

  console.log('Connected to MySQL. Running seed...');

  const seedFile = path.join(__dirname, 'seed.sql');
  const sql = fs.readFileSync(seedFile, 'utf-8');
  
  await connection.query(sql);
  console.log('Seed data inserted successfully.');

  await connection.end();
}

runSeed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
