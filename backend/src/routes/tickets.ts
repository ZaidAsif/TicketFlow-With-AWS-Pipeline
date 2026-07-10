import { Router, Request, Response } from 'express';
import { query, execute } from '../db';
import type { Ticket, CreateTicketInput } from '../types';
import type { RowDataPacket, ResultSetHeader } from '../db';

const router = Router();

// GET /api/categories - list all categories
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await query<RowDataPacket[]>('SELECT * FROM categories ORDER BY name');
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// POST /api/tickets - submit a new ticket
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, category, contact_email } = req.body as CreateTicketInput;

    // Validate required fields
    const errors: string[] = [];
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      errors.push('Title is required');
    }
    if (title && title.length > 500) {
      errors.push('Title must be 500 characters or less');
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      errors.push('Description is required');
    }
    if (description && description.length > 5000) {
      errors.push('Description must be 5000 characters or less');
    }
    if (!category || typeof category !== 'string') {
      errors.push('Category is required');
    }
    if (contact_email && typeof contact_email === 'string' && contact_email.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contact_email)) {
        errors.push('Invalid email format');
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ success: false, error: errors.join('; ') });
      return;
    }

    // Validate category exists
    const categories = await query<RowDataPacket[]>(
      'SELECT id FROM categories WHERE name = ?',
      [category]
    );

    if (categories.length === 0) {
      res.status(400).json({ success: false, error: 'Invalid category' });
      return;
    }

    // Create the ticket
    const result = await execute(
      'INSERT INTO tickets (title, description, category, contact_email, status) VALUES (?, ?, ?, ?, ?)',
      [
        title.trim(),
        description.trim(),
        category,
        contact_email?.trim() || null,
        'open',
      ]
    );

    // Record initial status in history
    await execute(
      'INSERT INTO status_history (ticket_id, old_status, new_status) VALUES (?, NULL, ?)',
      [result.insertId, 'open']
    );

    const ticket = await query<RowDataPacket[]>(
      'SELECT * FROM tickets WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: ticket[0] as Ticket,
      message: 'Ticket submitted successfully',
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ success: false, error: 'Failed to create ticket' });
  }
});

// GET /api/tickets/:id - get a single ticket (public)
router.get('/:id', async (req: Request, res: Response) => {
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

    res.json({ success: true, data: tickets[0] as Ticket });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch ticket' });
  }
});

export default router;
