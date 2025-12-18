import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimit.js';
import routes from './routes/index.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: env.cors.allowedOrigins,
  credentials: true,
}));

// Rate limiting
app.use(generalLimiter);

// Parse JSON for non-webhook routes
app.use((req, res, next) => {
  if (req.path === '/api/webhooks/stripe') {
    // Skip JSON parsing for webhooks - they need raw body
    next();
  } else {
    express.json()(req, res, next);
  }
});

// API routes
app.use('/api', routes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(env.port, () => {
  logger.info({
    port: env.port,
    env: env.nodeEnv,
    allowedOrigins: env.cors.allowedOrigins,
  }, `Payment service started on port ${env.port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});
