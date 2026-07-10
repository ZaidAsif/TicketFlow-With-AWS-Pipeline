import { Router, Request, Response } from 'express';
import { query, execute } from '../db';
import type { RowDataPacket } from '../db';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  try {
    // Test database connectivity
    await query<RowDataPacket[]>('SELECT 1 AS health_check');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
