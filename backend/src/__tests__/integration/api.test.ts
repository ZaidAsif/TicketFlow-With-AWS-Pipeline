import express from 'express';
import request from 'supertest';
import { setPool } from '../../db';
import mysql, { Pool } from 'mysql2/promise';
import healthRouter from '../../routes/health';
import ticketsRouter from '../../routes/tickets';
import adminRouter from '../../routes/admin';
import { config } from '../../config';

// These integration tests require a running MySQL database.
// By default they use the test database config from environment variables.
// Run with: npm run test:integration
// or: DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=root DB_PASSWORD=root DB_NAME=ticket_system_test npm run test:integration

let testPool: Pool;
const app = express();
app.use(express.json());
app.use('/', healthRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/admin', adminRouter);

function getAuthHeader() {
  const creds = Buffer.from(`${config.admin.username}:${config.admin.password}`).toString('base64');
  return `Basic ${creds}`;
}

beforeAll(async () => {
  const dbConfig = config.testDb;
  
  // Create connection without database first to set up test DB
  const conn = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
  });

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.name}\``);
  await conn.query(`USE \`${dbConfig.name}\``);

  // Create tables
  await conn.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE
    ) ENGINE=InnoDB
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(100) NOT NULL,
      status ENUM('open', 'in_progress', 'resolved') NOT NULL DEFAULT 'open',
      contact_email VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS status_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT NOT NULL,
      old_status VARCHAR(20) DEFAULT NULL,
      new_status VARCHAR(20) NOT NULL,
      changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  // Seed test categories
  await conn.query(`INSERT IGNORE INTO categories (name) VALUES ('Bug Report'), ('Feature Request'), ('General Inquiry')`);

  await conn.end();

  // Create the pool for the app to use
  testPool = mysql.createPool({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.name,
    waitForConnections: true,
    connectionLimit: 5,
  });

  setPool(testPool);
});

afterAll(async () => {
  if (testPool) {
    const cleanupConn = await mysql.createConnection({
      host: config.testDb.host,
      port: config.testDb.port,
      user: config.testDb.user,
      password: config.testDb.password,
    });
    await cleanupConn.query(`DROP DATABASE IF EXISTS \`${config.testDb.name}\``);
    await cleanupConn.end();
    await testPool.end();
  }
});

beforeEach(async () => {
  // Clean tables before each test
  const conn = await mysql.createConnection({
    host: config.testDb.host,
    port: config.testDb.port,
    user: config.testDb.user,
    password: config.testDb.password,
    database: config.testDb.name,
  });
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  await conn.query('TRUNCATE TABLE status_history');
  await conn.query('TRUNCATE TABLE tickets');
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  await conn.end();
});

describe('Integration Tests', () => {
  describe('Health Check', () => {
    it('should return 200 with database connected', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.database).toBe('connected');
    });
  });

  describe('Ticket CRUD', () => {
    it('should submit a ticket and retrieve it', async () => {
      // Create ticket
      const createRes = await request(app)
        .post('/api/tickets')
        .send({
          title: 'Integration test ticket',
          description: 'This is a test ticket from integration test',
          category: 'Bug Report',
          contact_email: 'test@example.com',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.id).toBeDefined();
      const ticketId = createRes.body.data.id;

      // Retrieve ticket
      const getRes = await request(app).get(`/api/tickets/${ticketId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.title).toBe('Integration test ticket');
      expect(getRes.body.data.contact_email).toBe('test@example.com');
    });

    it('should handle multiple ticket submissions', async () => {
      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post('/api/tickets')
          .send({
            title: `Ticket ${i}`,
            description: `Description ${i}`,
            category: 'Bug Report',
          });
        expect(res.status).toBe(201);
      }

      const ticketsRes = await request(app)
        .get('/api/admin/tickets')
        .set('Authorization', getAuthHeader());

      expect(ticketsRes.status).toBe(200);
      expect(ticketsRes.body.data).toHaveLength(3);
    });

    it('should reject ticket with invalid category', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .send({
          title: 'Test',
          description: 'Test',
          category: 'InvalidCategory',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid category');
    });
  });

  describe('Admin Operations', () => {
    it('should update ticket status and record history', async () => {
      // Create a ticket first
      const createRes = await request(app)
        .post('/api/tickets')
        .send({
          title: 'Status update test',
          description: 'Testing status changes',
          category: 'Bug Report',
        });

      const ticketId = createRes.body.data.id;

      // Update to in_progress
      const updateRes = await request(app)
        .patch(`/api/admin/tickets/${ticketId}`)
        .set('Authorization', getAuthHeader())
        .send({ status: 'in_progress' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.status).toBe('in_progress');

      // Update to resolved
      await request(app)
        .patch(`/api/admin/tickets/${ticketId}`)
        .set('Authorization', getAuthHeader())
        .send({ status: 'resolved' });

      // Check history
      const detailRes = await request(app)
        .get(`/api/admin/tickets/${ticketId}`)
        .set('Authorization', getAuthHeader());

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.history).toHaveLength(3); // open -> in_progress, in_progress -> resolved
    });

    it('should return stats', async () => {
      // Create tickets with different statuses
      const ticket1 = await request(app)
        .post('/api/tickets')
        .send({ title: 'Open ticket', description: 'Test', category: 'Bug Report' });

      const ticket2 = await request(app)
        .post('/api/tickets')
        .send({ title: 'In progress', description: 'Test', category: 'Feature Request' });

      await request(app)
        .patch(`/api/admin/tickets/${ticket2.body.data.id}`)
        .set('Authorization', getAuthHeader())
        .send({ status: 'in_progress' });

      const statsRes = await request(app)
        .get('/api/admin/tickets/stats')
        .set('Authorization', getAuthHeader());

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.data.total).toBe(2);
      expect(statsRes.body.data.byStatus.find((s: any) => s.status === 'open').count).toBe(1);
      expect(statsRes.body.data.byStatus.find((s: any) => s.status === 'in_progress').count).toBe(1);
    });

    it('should filter tickets by status', async () => {
      await request(app)
        .post('/api/tickets')
        .send({ title: 'Open ticket', description: 'Test', category: 'Bug Report' });

      const ticket2 = await request(app)
        .post('/api/tickets')
        .send({ title: 'Resolved ticket', description: 'Test', category: 'Feature Request' });

      await request(app)
        .patch(`/api/admin/tickets/${ticket2.body.data.id}`)
        .set('Authorization', getAuthHeader())
        .send({ status: 'resolved' });

      const filteredRes = await request(app)
        .get('/api/admin/tickets?status=open')
        .set('Authorization', getAuthHeader());

      expect(filteredRes.status).toBe(200);
      expect(filteredRes.body.data).toHaveLength(1);
      expect(filteredRes.body.data[0].status).toBe('open');
    });
  });
});
