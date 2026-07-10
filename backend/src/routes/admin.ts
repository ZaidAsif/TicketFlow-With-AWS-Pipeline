import { Router, Request, Response } from 'express';
import { query, execute } from '../db';
import { basicAuth } from '../middleware/auth';
import type { Ticket, TicketStats, StatusHistory } from '../types';
import type { RowDataPacket } from '../db';

const router = Router();

// All admin routes require authentication
router.use(basicAuth);

// GET /api/admin/tickets - list all tickets with optional filtering and pagination
router.get('/tickets', async (req: Request, res: Response) => {
  try {
    const { status, category, sort, page, limit } = req.query;
    let whereSql = 'WHERE 1=1';
    const params: any[] = [];

    if (status && typeof status === 'string') {
      whereSql += ' AND status = ?';
      params.push(status);
    }

    if (category && typeof category === 'string') {
      whereSql += ' AND category = ?';
      params.push(category);
    }

    // Get total count for pagination
    const countResult = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM tickets ${whereSql}`,
      params
    );
    const total = countResult[0]?.total ?? 0;

    // Default sort by newest first
    let orderSql = ' ORDER BY created_at DESC';
    if (sort && typeof sort === 'string' && sort.startsWith('created_at')) {
      orderSql = ` ORDER BY ${sort}`;
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    // LIMIT/OFFSET values are validated as safe integers — safe to interpolate
    const tickets = await query<RowDataPacket[]>(
      `SELECT * FROM tickets ${whereSql}${orderSql} LIMIT ${limitNum} OFFSET ${offset}`,
      params
    );

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: tickets as Ticket[],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching admin tickets:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tickets' });
  }
});

// GET /api/admin/tickets/stats - get ticket statistics
router.get('/tickets/stats', async (_req: Request, res: Response) => {
  try {
    const total = await query<RowDataPacket[]>('SELECT COUNT(*) as count FROM tickets');
    const byStatus = await query<RowDataPacket[]>(
      'SELECT status, COUNT(*) as count FROM tickets GROUP BY status ORDER BY status'
    );
    const byCategory = await query<RowDataPacket[]>(
      'SELECT category, COUNT(*) as count FROM tickets GROUP BY category ORDER BY category'
    );

    const stats: TicketStats = {
      total: total[0].count,
      byStatus: byStatus as { status: string; count: number }[],
      byCategory: byCategory as { category: string; count: number }[],
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// GET /api/admin/tickets/:id - get single ticket with history
router.get('/tickets/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid ticket ID' });
      return;
    }

    const tickets = await query<RowDataPacket[]>(
      'SELECT * FROM tickets WHERE id = ?',
      [id]
    );

    if (tickets.length === 0) {
      res.status(404).json({ success: false, error: 'Ticket not found' });
      return;
    }

    const history = await query<RowDataPacket[]>(
      'SELECT * FROM status_history WHERE ticket_id = ? ORDER BY changed_at DESC',
      [id]
    );

    res.json({
      success: true,
      data: {
        ticket: tickets[0] as Ticket,
        history: history as StatusHistory[],
      },
    });
  } catch (error) {
    console.error('Error fetching admin ticket:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ticket' });
  }
});

// PATCH /api/admin/tickets/:id - update ticket status
router.patch('/tickets/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid ticket ID' });
      return;
    }

    const { status } = req.body;
    const validStatuses = ['open', 'in_progress', 'resolved'];

    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    // Get current ticket
    const tickets = await query<RowDataPacket[]>(
      'SELECT * FROM tickets WHERE id = ?',
      [id]
    );

    if (tickets.length === 0) {
      res.status(404).json({ success: false, error: 'Ticket not found' });
      return;
    }

    const currentTicket = tickets[0] as Ticket;
    const oldStatus = currentTicket.status;

    if (oldStatus === status) {
      res.status(400).json({
        success: false,
        error: `Ticket is already in "${status}" status`,
      });
      return;
    }

    // Update the ticket
    await execute(
      'UPDATE tickets SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    // Record the change in history
    await execute(
      'INSERT INTO status_history (ticket_id, old_status, new_status) VALUES (?, ?, ?)',
      [id, oldStatus, status]
    );

    // Fetch updated ticket
    const updated = await query<RowDataPacket[]>(
      'SELECT * FROM tickets WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      data: updated[0] as Ticket,
      message: `Ticket status updated from "${oldStatus}" to "${status}"`,
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ success: false, error: 'Failed to update ticket' });
  }
});

export default router;
