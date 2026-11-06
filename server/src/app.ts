
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
      // allow requests with no origin or matching allowed, vercel, or onrender domains
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com')
      ) {
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
    let userCount = -1;
    let tablesStatus = 'missing';
    try {
      userCount = await prisma.user.count();
      tablesStatus = 'ready';
    } catch (err: any) {
      tablesStatus = err?.message || 'table_not_found';
    }
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      tablesStatus,
      userCount,
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

// RFQ Routes
import { rfqRouter } from './modules/rfqs/rfq.routes.js';
app.use('/api/v1/rfqs', rfqRouter);

// Vendor Portal Routes
import { vendorPortalRouter } from './modules/vendor-portal/vendor-portal.routes.js';
app.use('/api/v1/vendor-portal', vendorPortalRouter);

// Week 3 Approval Routes
import { approvalRouter } from './modules/approvals/approval.routes.js';
app.use('/api/v1/approvals', approvalRouter);

// Week 3 Purchase Order Routes
import { purchaseOrderRouter } from './modules/purchase-orders/po.routes.js';
app.use('/api/v1/purchase-orders', purchaseOrderRouter);

// Week 3 Invoice Routes
import { invoiceRouter } from './modules/invoices/invoice.routes.js';
app.use('/api/v1/invoices', invoiceRouter);

// Week 4 Notification Routes
import { notificationRouter } from './modules/notifications/notification.routes.js';
app.use('/api/v1/notifications', notificationRouter);

// Week 4 Audit & Activity Timeline Routes
import { auditRouter } from './modules/audit/audit.routes.js';
app.use('/api/v1/audit', auditRouter);

// Week 4 Reports & Analytics Routes
import { reportsRouter } from './modules/reports/reports.routes.js';
app.use('/api/v1/reports', reportsRouter);

// Serve Client SPA in Production / Render full-stack deployments
import path from 'path';
import fs from 'fs';

const possibleClientPaths = [
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), 'dist/client'),
];

const clientDistPath = possibleClientPaths.find((p) => fs.existsSync(p));

if (clientDistPath) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Central error handler
app.use(errorHandler);
