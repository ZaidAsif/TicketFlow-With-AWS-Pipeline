import express from 'express';
import request from 'supertest';
import ticketsRouter from '../../routes/tickets';
import * as db from '../../db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// Mock the database module
jest.mock('../../db', () => ({
  query: jest.fn(),
  execute: jest.fn(),
  getPool: jest.fn(),
  closePool: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api/tickets', ticketsRouter);

const mockedQuery = db.query as jest.Mock;
const mockedExecute = db.execute as jest.Mock;

describe('Ticket Routes - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/tickets', () => {
    it('should reject a ticket with missing title', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .send({
          description: 'Test description',
          category: 'Bug Report',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Title');
    });

    it('should reject a ticket with missing description', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .send({
          title: 'Test title',
          category: 'Bug Report',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Description');
    });

    it('should reject a ticket with missing category', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .send({
          title: 'Test title',
          description: 'Test description',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Category');
    });

    it('should reject a ticket with invalid email', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .send({
          title: 'Test title',
          description: 'Test description',
          category: 'Bug Report',
          contact_email: 'not-an-email',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('email');
    });

    it('should reject a ticket with title exceeding 500 characters', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .send({
          title: 'x'.repeat(501),
          description: 'Test description',
          category: 'Bug Report',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('500 characters');
    });

    it('should reject a ticket with invalid category', async () => {
      mockedQuery.mockResolvedValueOnce([]); // No matching category

      const res = await request(app)
        .post('/api/tickets')
        .send({
          title: 'Valid title',
          description: 'Valid description',
          category: 'NonExistentCategory',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid category');
    });

    it('should create a ticket with valid data', async () => {
      // Category exists check
      mockedQuery.mockResolvedValueOnce([{ id: 1, name: 'Bug Report' }]);
      // Insert ticket
      mockedExecute.mockResolvedValueOnce({ insertId: 1 } as ResultSetHeader);
      // Insert history
      mockedExecute.mockResolvedValueOnce({} as ResultSetHeader);
      // Fetch created ticket
      mockedQuery.mockResolvedValueOnce([{
        id: 1,
        title: 'Test title',
        description: 'Test description',
        category: 'Bug Report',
        status: 'open',
        contact_email: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }]);

      const res = await request(app)
        .post('/api/tickets')
        .send({
          title: 'Test title',
          description: 'Test description',
          category: 'Bug Report',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Test title');
      expect(res.body.data.status).toBe('open');
    });

    it('should handle database connection failure gracefully', async () => {
      mockedQuery.mockRejectedValueOnce(new Error('DB connection failed'));

      const res = await request(app)
        .post('/api/tickets')
        .send({
          title: 'Test title',
          description: 'Test description',
          category: 'Bug Report',
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/tickets/:id', () => {
    it('should return 400 for invalid ticket ID', async () => {
      const res = await request(app).get('/api/tickets/abc');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid ticket ID');
    });

    it('should return 404 for non-existent ticket', async () => {
      mockedQuery.mockResolvedValueOnce([]);
      const res = await request(app).get('/api/tickets/999');
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Ticket not found');
    });

    it('should return a ticket by ID', async () => {
      mockedQuery.mockResolvedValueOnce([{
        id: 1,
        title: 'Test ticket',
        description: 'Test description',
        category: 'Bug Report',
        status: 'open',
        contact_email: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }]);

      const res = await request(app).get('/api/tickets/1');
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Test ticket');
    });
  });

  describe('GET /api/tickets/categories', () => {
    it('should return list of categories', async () => {
      mockedQuery.mockResolvedValueOnce([
        { id: 1, name: 'Bug Report' },
        { id: 2, name: 'Feature Request' },
      ]);

      const res = await request(app).get('/api/tickets/categories');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should handle errors gracefully', async () => {
      mockedQuery.mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app).get('/api/tickets/categories');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});
