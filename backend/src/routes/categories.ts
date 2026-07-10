import { Router, Request, Response } from 'express';
import { query } from '../db';
import type { RowDataPacket } from '../db';

const router = Router();

// GET /api/categories - list all categories (public)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await query<RowDataPacket[]>('SELECT * FROM categories ORDER BY name');
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

export default router;
