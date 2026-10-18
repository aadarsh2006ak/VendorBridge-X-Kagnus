import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/summary',
  authenticate,
  authorize('dashboard:read'),
  (_req: Request, res: Response, _next: NextFunction) => {
    // Week 1: Clean contract with explicit empty states for upcoming weeks
    res.status(200).json({
      activeRfqs: 0,
      pendingApprovals: 0,
      posThisMonth: { count: 0, amount: 0 },
      overdueInvoices: 0,
      recentPurchaseOrders: [],
      spendingTrend: [],
    });
  }
);
