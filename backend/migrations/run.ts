import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { parseDatabaseUrl } from '../src/dbUrl';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runMigrations() {
  const parsedUrl = parseDatabaseUrl(process.env.DATABASE_URL || '');
  
  const connection = await mysql.createConnection({
    host: parsedUrl?.host || process.env.DB_HOST || '127.0.0.1',
    port: parsedUrl?.port || parseInt(process.env.DB_PORT || '3306', 10),
    user: parsedUrl?.user || process.env.DB_USER || 'root',
    password: parsedUrl?.password || process.env.DB_PASSWORD || '',
    database: parsedUrl?.database || process.env.DB_NAME || 'ticket_system',
    multipleStatements: true,
  });

  console.log('Connected to MySQL. Running migrations...');

  const migrationFiles = fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.sql'))
    .sort();  

  for (const file of migrationFiles) {
    const filePath = path.join(__dirname, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    console.log(`Running migration: ${file}`);
    await connection.query(sql);
    console.log(`Migration complete: ${file}`);
  }

  await connection.end();
  console.log('All migrations completed successfully.');
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
