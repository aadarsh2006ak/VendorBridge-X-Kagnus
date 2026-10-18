import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { csrfProtection } from './middleware/csrf.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

// Security headers
app.use(helmet());

// Strict CORS with credentials
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body parsers and cookie parser
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// CSRF check on mutating methods
app.use(csrfProtection);

// Health check endpoint (including DB check)
app.get('/api/v1/health', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Central error handler
app.use(errorHandler);
