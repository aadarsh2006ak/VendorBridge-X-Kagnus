import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { prisma } from '../../lib/prisma.js';
import { RfqStatus } from '@prisma/client';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/summary',
  authenticate,
  authorize('dashboard:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let activeRfqs = 0;
      const now = new Date();

      if (req.user?.role === 'VENDOR') {
        const member = await prisma.vendorMember.findUnique({
          where: { userId: req.user.id },
        });
        if (member) {
          activeRfqs = await prisma.rfqVendor.count({
            where: {
              vendorId: member.vendorId,
              rfq: {
                status: RfqStatus.OPEN,
                deadline: { gt: now },
                deletedAt: null,
              },
            },
          });
        }
      } else {
        activeRfqs = await prisma.rfq.count({
          where: {
            status: RfqStatus.OPEN,
            deadline: { gt: now },
            deletedAt: null,
          },
        });
      }

      res.status(200).json({
        activeRfqs,
        pendingApprovals: 0,
        posThisMonth: { count: 0, amount: 0 },
        overdueInvoices: 0,
        recentPurchaseOrders: [],
        spendingTrend: [],
      });
    } catch (error) {
      next(error);
    }
  }
);
