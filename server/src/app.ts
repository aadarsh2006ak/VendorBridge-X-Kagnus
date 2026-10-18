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
const allowedOrigins = [env.CLIENT_ORIGIN, 'http://localhost:5173', 'http://localhost:5174'];
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
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

// Auth Routes
import { authRouter } from './modules/auth/auth.routes.js';
app.use('/api/v1/auth', authRouter);

// Vendor Routes
import { vendorRouter } from './modules/vendors/vendor.routes.js';
app.use('/api/v1/vendors', vendorRouter);

// Dashboard Routes
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
app.use('/api/v1/dashboard', dashboardRouter);

// Central error handler
app.use(errorHandler);
