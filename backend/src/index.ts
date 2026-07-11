import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import logger from './logger';
import { getPool, closePool } from './db';
import healthRouter from './routes/health';
import ticketsRouter from './routes/tickets';
import categoriesRouter from './routes/categories';
import adminRouter from './routes/admin';

const app = express();

// Trust proxy for rate limiting behind a load balancer
app.set('trust proxy', 1);

// CORS configuration — supports comma-separated origins
const corsOrigin = config.corsOrigin.includes(',')
  ? config.corsOrigin.split(',').map(s => s.trim())
  : config.corsOrigin;

app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Parse JSON bodies
app.use(express.json({ limit: '10kb' }));

// Rate limiting for ticket submission
const submitLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { success: false, error: 'Too many submissions, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Mount routes
app.use('/', healthRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/tickets', submitLimiter, ticketsRouter);
app.use('/api/admin', adminRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: config.nodeEnv === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// Start server
async function start() {
  try {
    // Initialize database connection pool
    getPool();
    logger.info('Database connection pool initialized');

    startServer(config.port);
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

function startServer(port: number, attempt = 0) {
  const server = app.listen(port, () => {
    logger.info(`Server running on port ${port} in ${config.nodeEnv} mode`);
    logger.info(`CORS origin: ${config.corsOrigin}`);
    logger.info(`Health check: http://localhost:${port}/health`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE' && attempt < 4) {
      const nextPort = port + 1;
      logger.warn(`Port ${port} is already in use. Retrying on ${nextPort}.`);
      setImmediate(() => startServer(nextPort, attempt + 1));
      return;
    }

    logger.error('Failed to start server', { error, port });
    process.exit(1);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await closePool();
  process.exit(0);
});

// Only start if not in test mode
if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app };
export default app;
