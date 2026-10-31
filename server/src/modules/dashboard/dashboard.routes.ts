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
      let member: any = null;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      if (req.user?.role === 'VENDOR') {
        member = await prisma.vendorMember.findUnique({
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

      // Live Pending Approvals (Staff only)
      const pendingApprovals =
        req.user?.role === 'VENDOR'
          ? 0
          : await prisma.approvalRequest.count({
              where: { status: 'PENDING' },
            });

      // Live POs this month
      const posFilter = req.user?.role === 'VENDOR' && member ? { vendorId: member.vendorId } : {};
      const posRows = await prisma.purchaseOrder.findMany({
        where: {
          ...posFilter,
          createdAt: { gte: startOfMonth },
        },
        select: { grandTotal: true },
      });
      const posCount = posRows.length;
      const posAmount = posRows.reduce((acc, row) => acc + row.grandTotal.toNumber(), 0);

      // Live Overdue Invoices
      const overdueInvoices = await prisma.invoice.count({
        where: {
          ...posFilter,
          status: 'PENDING_PAYMENT',
          dueDate: { lt: now },
        },
      });

      // Live Recent Purchase Orders
      const recentPosRaw = await prisma.purchaseOrder.findMany({
        where: posFilter,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: { select: { name: true } },
        },
      });

      const recentPurchaseOrders = recentPosRaw.map((po) => ({
        id: po.id,
        poNumber: po.poNumber,
        vendor: po.vendor.name,
        amount: po.grandTotal.toNumber(),
        status: po.status,
        date: po.poDate,
      }));

      res.status(200).json({
        activeRfqs,
        pendingApprovals,
        posThisMonth: { count: posCount, amount: posAmount },
        overdueInvoices,
        recentPurchaseOrders,
        spendingTrend: [],
      });
    } catch (error) {
      next(error);
    }
  }
);
