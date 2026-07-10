import express from 'express';
import request from 'supertest';
import healthRouter from '../../routes/health';
import * as db from '../../db';

jest.mock('../../db', () => ({
  query: jest.fn(),
  execute: jest.fn(),
  getPool: jest.fn(),
  closePool: jest.fn(),
}));

const app = express();
app.use('/', healthRouter);

const mockedQuery = db.query as jest.Mock;

describe('Health Check Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 and healthy status when DB is connected', async () => {
    mockedQuery.mockResolvedValueOnce([{ health_check: 1 }]);

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
  });

  it('should return 503 when database is disconnected', async () => {
    mockedQuery.mockRejectedValueOnce(new Error('Connection refused'));

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
    expect(res.body.database).toBe('disconnected');
    expect(res.body.error).toContain('Connection refused');
  });
});
