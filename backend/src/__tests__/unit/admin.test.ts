import express from 'express';
import request from 'supertest';
import adminRouter from '../../routes/admin';
import * as db from '../../db';
import { config } from '../../config';
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
app.use('/api/admin', adminRouter);

const mockedQuery = db.query as jest.Mock;
const mockedExecute = db.execute as jest.Mock;

function getAuthHeader() {
  const creds = Buffer.from(`${config.admin.username}:${config.admin.password}`).toString('base64');
  return `Basic ${creds}`;
}

describe('Admin Routes - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 without auth header', async () => {
      const res = await request(app).get('/api/admin/tickets');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Authentication required');
    });

    it('should return 401 with invalid credentials', async () => {
      const res = await request(app)
        .get('/api/admin/tickets')
        .set('Authorization', 'Basic ' + Buffer.from('bad:creds').toString('base64'));
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid credentials');
    });

    it('should accept valid credentials', async () => {
      mockedQuery.mockResolvedValueOnce([{ total: 0 }]);
      mockedQuery.mockResolvedValueOnce([]);
      const res = await request(app)
        .get('/api/admin/tickets')
        .set('Authorization', getAuthHeader());
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/admin/tickets', () => {
    it('should return all tickets', async () => {
      const mockTickets = [
        { id: 1, title: 'Ticket 1', status: 'open', category: 'Bug' },
        { id: 2, title: 'Ticket 2', status: 'resolved', category: 'Feature' },
      ];
      mockedQuery.mockResolvedValueOnce([{ total: 2 }]);
      mockedQuery.mockResolvedValueOnce(mockTickets);

      const res = await request(app)
        .get('/api/admin/tickets')
        .set('Authorization', getAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should filter tickets by status', async () => {
      mockedQuery.mockResolvedValueOnce([{ total: 0 }]);
      mockedQuery.mockResolvedValueOnce([]);
      
      const res = await request(app)
        .get('/api/admin/tickets?status=open')
        .set('Authorization', getAuthHeader());

      expect(res.status).toBe(200);
      // Check that the data query (second call) uses the filter
      expect(mockedQuery).toHaveBeenNthCalledWith(2,
        expect.stringContaining('WHERE 1=1 AND status = ?'),
        expect.arrayContaining(['open'])
      );
    });

    it('should filter tickets by category', async () => {
      mockedQuery.mockResolvedValueOnce([{ total: 0 }]);
      mockedQuery.mockResolvedValueOnce([]);
      
      const res = await request(app)
        .get('/api/admin/tickets?category=Bug')
        .set('Authorization', getAuthHeader());

      expect(res.status).toBe(200);
      expect(mockedQuery).toHaveBeenNthCalledWith(2,
        expect.stringContaining('WHERE 1=1 AND category = ?'),
        expect.arrayContaining(['Bug'])
      );
    });
  });

  describe('GET /api/admin/tickets/stats', () => {
    it('should return ticket statistics', async () => {
      mockedQuery
        .mockResolvedValueOnce([{ count: 10 }])
        .mockResolvedValueOnce([
          { status: 'open', count: 5 },
          { status: 'resolved', count: 5 },
        ])
        .mockResolvedValueOnce([
          { category: 'Bug', count: 3 },
          { category: 'Feature', count: 7 },
        ]);

      const res = await request(app)
        .get('/api/admin/tickets/stats')
        .set('Authorization', getAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(10);
      expect(res.body.data.byStatus).toHaveLength(2);
      expect(res.body.data.byCategory).toHaveLength(2);
    });
  });

  describe('GET /api/admin/tickets/:id', () => {
    it('should return ticket with history', async () => {
      mockedQuery
        .mockResolvedValueOnce([{ id: 1, title: 'Test', status: 'open' }])
        .mockResolvedValueOnce([
          { id: 1, ticket_id: 1, old_status: null, new_status: 'open' },
        ]);

      const res = await request(app)
        .get('/api/admin/tickets/1')
        .set('Authorization', getAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.data.ticket.title).toBe('Test');
      expect(res.body.data.history).toHaveLength(1);
    });

    it('should return 404 for non-existent ticket', async () => {
      mockedQuery.mockResolvedValueOnce([]);
      
      const res = await request(app)
        .get('/api/admin/tickets/999')
        .set('Authorization', getAuthHeader());
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/admin/tickets/:id', () => {
    it('should update ticket status', async () => {
      // Current ticket
      mockedQuery.mockResolvedValueOnce([{
        id: 1, title: 'Test', status: 'open'
      }]);
      // Update execution
      mockedExecute.mockResolvedValueOnce({} as ResultSetHeader);
      // History insertion
      mockedExecute.mockResolvedValueOnce({} as ResultSetHeader);
      // Fetch updated
      mockedQuery.mockResolvedValueOnce([{
        id: 1, title: 'Test', status: 'in_progress'
      }]);

      const res = await request(app)
        .patch('/api/admin/tickets/1')
        .set('Authorization', getAuthHeader())
        .send({ status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('in_progress');
    });

    it('should reject invalid status values', async () => {
      const res = await request(app)
        .patch('/api/admin/tickets/1')
        .set('Authorization', getAuthHeader())
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
    });

    it('should reject if ticket is already in that status', async () => {
      mockedQuery.mockResolvedValueOnce([{
        id: 1, title: 'Test', status: 'resolved'
      }]);

      const res = await request(app)
        .patch('/api/admin/tickets/1')
        .set('Authorization', getAuthHeader())
        .send({ status: 'resolved' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already');
    });
  });
});
