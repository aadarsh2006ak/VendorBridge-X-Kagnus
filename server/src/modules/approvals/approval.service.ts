import { prisma } from '../../lib/prisma.js';
import {
  ApprovalStatus,
  QuotationStatus,
  PoStatus,
  Prisma,
} from '@prisma/client';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  InvalidStateTransitionError,
} from '../../lib/errors.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationService } from '../notifications/notification.service.js';
import {
  DecideApprovalInput,
  RejectApprovalInput,
  ListApprovalsQuery,
} from './approval.schemas.js';

export class ApprovalService {
  /**
   * Lists approval requests with filtering and counts.
   */
  public static async listApprovals(query: ListApprovalsQuery, user: { id: string; role: string }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ApprovalRequestWhereInput = {};

    if (query.status && query.status !== 'ALL') {
      where.status = query.status as ApprovalStatus;
    }

    if (query.search) {
      where.OR = [
        { rfq: { code: { contains: query.search, mode: 'insensitive' } } },
        { rfq: { title: { contains: query.search, mode: 'insensitive' } } },
        { quotation: { vendor: { name: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }

    const [items, total, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.approvalRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          rfq: {
            select: {
              id: true,
              code: true,
              title: true,
              category: true,
              deadline: true,
              status: true,
            },
          },
          quotation: {
            select: {
              id: true,
              grandTotal: true,
              deliveryDays: true,
              paymentTermsDays: true,
              vendor: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  rating: true,
                  gstNumber: true,
                },
              },
            },
          },
          requestedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          decidedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          timeline: {
            orderBy: { stepNumber: 'asc' },
          },
        },
      }),
      prisma.approvalRequest.count({ where }),
      prisma.approvalRequest.count({ where: { status: ApprovalStatus.PENDING } }),
      prisma.approvalRequest.count({ where: { status: ApprovalStatus.APPROVED } }),
      prisma.approvalRequest.count({ where: { status: ApprovalStatus.REJECTED } }),
    ]);

    return {
      items: items.map((req) => ({
        id: req.id,
        rfqId: req.rfqId,
        quotationId: req.quotationId,
        status: req.status,
        currentStep: req.currentStep,
        remarks: req.remarks,
        createdAt: req.createdAt,
        decidedAt: req.decidedAt,
        rfq: req.rfq,
        quotation: {
          ...req.quotation,
          grandTotal: req.quotation.grandTotal.toNumber(),
        },
        requestedBy: req.requestedBy,
        decidedBy: req.decidedBy,
        timeline: req.timeline,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      counts: {
        all: pendingCount + approvedCount + rejectedCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
    };
  }

  /**
   * Retrieves single approval request with full RFQ and Quotation context (Screen 8).
   */
  public static async getApprovalById(id: string) {
    const req = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        rfq: {
          include: {
            items: { orderBy: { position: 'asc' } },
          },
        },
        quotation: {
          include: {
            vendor: true,
            items: {
              include: {
                rfqItem: true,
              },
            },
            purchaseOrder: {
              select: {
                id: true,
                poNumber: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        decidedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        timeline: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    if (!req) {
      throw new NotFoundError('Approval request not found');
    }

    return {
      id: req.id,
      rfqId: req.rfqId,
      quotationId: req.quotationId,
      status: req.status,
      currentStep: req.currentStep,
      remarks: req.remarks,
      createdAt: req.createdAt,
      decidedAt: req.decidedAt,
      rfq: {
        id: req.rfq.id,
        code: req.rfq.code,
        title: req.rfq.title,
        category: req.rfq.category,
        description: req.rfq.description,
        deadline: req.rfq.deadline,
        status: req.rfq.status,
        items: req.rfq.items.map((i) => ({
          ...i,
          quantity: i.quantity.toNumber(),
        })),
      },
      quotation: {
        id: req.quotation.id,
        status: req.quotation.status,
        subtotal: req.quotation.subtotal.toNumber(),
        taxAmount: req.quotation.taxAmount.toNumber(),
        grandTotal: req.quotation.grandTotal.toNumber(),
        deliveryDays: req.quotation.deliveryDays,
        paymentTermsDays: req.quotation.paymentTermsDays,
        notes: req.quotation.notes,
        submittedAt: req.quotation.submittedAt,
        vendor: req.quotation.vendor,
        items: req.quotation.items.map((i) => ({
          id: i.id,
          rfqItemId: i.rfqItemId,
          name: i.rfqItem.name,
          quantity: i.rfqItem.quantity.toNumber(),
          unit: i.rfqItem.unit,
          unitPrice: i.unitPrice.toNumber(),
          lineTotal: i.lineTotal.toNumber(),
          deliveryDays: i.deliveryDays,
        })),
        purchaseOrder: req.quotation.purchaseOrder,
      },
      requestedBy: req.requestedBy,
      decidedBy: req.decidedBy,
      timeline: req.timeline,
    };
  }

  /**
   * Retrieves approval by RFQ ID.
   */
  public static async getApprovalByRfqId(rfqId: string) {
    const req = await prisma.approvalRequest.findFirst({
      where: { rfqId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!req) return null;
    return this.getApprovalById(req.id);
  }

  /**
   * Approves request, records remarks, updates status, and generates Purchase Order.
   */
  public static async approve(
    id: string,
    input: DecideApprovalInput,
    user: { id: string; role: string; firstName: string; lastName: string },
    ipAddress?: string
  ) {
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      throw new ForbiddenError('Only authorized Managers and Administrators can approve procurement requests');
    }

    const approval = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        rfq: { include: { items: true } },
        quotation: {
          include: {
            items: { include: { rfqItem: true } },
            vendor: true,
          },
        },
      },
    });

    if (!approval) {
      throw new NotFoundError('Approval request not found');
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new InvalidStateTransitionError(
        `Cannot approve request with current status '${approval.status}'. Only PENDING requests can be approved.`
      );
    }

    return await prisma.$transaction(async (tx) => {
      const now = new Date();
      const approverTitle = user.role === 'ADMIN' ? 'Administrator' : 'Finance Manager';

      // 1. Update ApprovalRequest
      const updatedApproval = await tx.approvalRequest.update({
        where: { id },
        data: {
          status: ApprovalStatus.APPROVED,
          decidedById: user.id,
          decidedAt: now,
          remarks: input.remarks || 'Approved without conditions',
          currentStep: 4, // Final step: Generate PO completed
        },
      });

      // 2. Update timeline steps
      await tx.approvalStep.updateMany({
        where: {
          approvalRequestId: id,
          stepNumber: 3,
        },
        data: {
          status: 'APPROVED',
          approverName: `${user.firstName} ${user.lastName} (${approverTitle})`,
          decidedAt: now,
          remarks: input.remarks || 'Approved',
        },
      });

      await tx.approvalStep.updateMany({
        where: {
          approvalRequestId: id,
          stepNumber: 4,
        },
        data: {
          status: 'COMPLETED',
          decidedAt: now,
          remarks: 'Official Purchase Order generated',
        },
      });

      // 3. Update Quotation status to APPROVED
      await tx.quotation.update({
        where: { id: approval.quotationId },
        data: {
          status: QuotationStatus.APPROVED,
        },
      });

      // 4. Generate Purchase Order (PO-YYYY-NNNN)
      const existingPo = await tx.purchaseOrder.findUnique({
        where: { quotationId: approval.quotationId },
      });

      let po = existingPo;

      if (!po) {
        const year = now.getFullYear();
        const counterKey = `PO-${year}`;
        const counter = await tx.counter.upsert({
          where: { key: counterKey },
          update: { value: { increment: 1 } },
          create: { key: counterKey, value: 1 },
        });
        const poNumber = `PO-${year}-${counter.value.toString().padStart(4, '0')}`;

        // Compute estimated delivery date
        const leadDays = approval.quotation.deliveryDays || 14;
        const deliveryDate = new Date(now.getTime() + leadDays * 24 * 60 * 60 * 1000);

        // CGST & SGST (9% each for 18% GST)
        const halfTax = approval.quotation.taxAmount.dividedBy(2);

        po = await tx.purchaseOrder.create({
          data: {
            poNumber,
            rfqId: approval.rfqId,
            quotationId: approval.quotationId,
            vendorId: approval.quotation.vendorId,
            createdById: user.id,
            status: PoStatus.ISSUED,
            poDate: now,
            deliveryDate,
            paymentTerms: approval.quotation.paymentTermsDays
              ? `${approval.quotation.paymentTermsDays} days net`
              : '30 days net',
            notes: approval.quotation.notes,
            subtotal: approval.quotation.subtotal,
            taxRate: approval.quotation.taxRate,
            cgstAmount: halfTax,
            sgstAmount: halfTax,
            taxAmount: approval.quotation.taxAmount,
            grandTotal: approval.quotation.grandTotal,
            items: {
              create: approval.quotation.items.map((item) => ({
                name: item.rfqItem.name,
                description: item.rfqItem.description,
                quantity: item.rfqItem.quantity,
                unit: item.rfqItem.unit,
                unitPrice: item.unitPrice,
                lineTotal: item.lineTotal,
              })),
            },
          },
        });

        await AuditService.log({
          entityType: 'PurchaseOrder',
          entityId: po.id,
          action: 'PO_GENERATED',
          actorId: user.id,
          ip: ipAddress,
          metadata: {
            poNumber: po.poNumber,
            rfqCode: approval.rfq.code,
            vendorName: approval.quotation.vendor.name,
            grandTotal: po.grandTotal.toString(),
          },
        });
      }

      await AuditService.log({
        entityType: 'ApprovalRequest',
        entityId: id,
        action: 'APPROVAL_APPROVED',
        actorId: user.id,
        ip: ipAddress,
        metadata: {
          rfqId: approval.rfqId,
          quotationId: approval.quotationId,
          poNumber: po?.poNumber,
          remarks: input.remarks,
        },
      });

      // Trigger notifications for requester and vendor
      await NotificationService.createNotification({
        userId: approval.requestedById,
        title: `Approval Granted: ${approval.rfq.code}`,
        message: `Procurement request approved. Purchase Order ${po?.poNumber || ''} generated.`,
        type: 'APPROVAL_DECIDED',
        entityType: 'PURCHASE_ORDER',
        entityId: po?.id,
        link: po ? `/purchase-orders/${po.id}` : `/approvals/${id}`,
      });

      if (po) {
        await NotificationService.notifyVendorMembers(approval.quotation.vendorId, {
          title: `Purchase Order Issued: ${po.poNumber}`,
          message: `Your quotation for ${approval.rfq.title} was approved. Purchase order has been issued.`,
          type: 'PO_GENERATED',
          entityType: 'PURCHASE_ORDER',
          entityId: po.id,
          link: `/purchase-orders/${po.id}`,
        });
      }

      return {
        approval: updatedApproval,
        purchaseOrder: po,
      };
    });
  }

  /**
   * Rejects approval request with mandatory remarks.
   */
  public static async reject(
    id: string,
    input: RejectApprovalInput,
    user: { id: string; role: string; firstName: string; lastName: string },
    ipAddress?: string
  ) {
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      throw new ForbiddenError('Only authorized Managers and Administrators can reject procurement requests');
    }

    const approval = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        rfq: true,
        quotation: true,
      },
    });

    if (!approval) {
      throw new NotFoundError('Approval request not found');
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new InvalidStateTransitionError(
        `Cannot reject request with current status '${approval.status}'. Only PENDING requests can be rejected.`
      );
    }

    return await prisma.$transaction(async (tx) => {
      const now = new Date();
      const approverTitle = user.role === 'ADMIN' ? 'Administrator' : 'Finance Manager';

      const updatedApproval = await tx.approvalRequest.update({
        where: { id },
        data: {
          status: ApprovalStatus.REJECTED,
          decidedById: user.id,
          decidedAt: now,
          remarks: input.remarks,
        },
      });

      await tx.approvalStep.updateMany({
        where: {
          approvalRequestId: id,
          stepNumber: 3,
        },
        data: {
          status: 'REJECTED',
          approverName: `${user.firstName} ${user.lastName} (${approverTitle})`,
          decidedAt: now,
          remarks: input.remarks,
        },
      });

      await tx.quotation.update({
        where: { id: approval.quotationId },
        data: {
          status: QuotationStatus.REJECTED,
        },
      });

      await AuditService.log({
        entityType: 'ApprovalRequest',
        entityId: id,
        action: 'APPROVAL_REJECTED',
        actorId: user.id,
        ip: ipAddress,
        metadata: {
          rfqId: approval.rfqId,
          quotationId: approval.quotationId,
          remarks: input.remarks,
        },
      });

      // Notify requester
      await NotificationService.createNotification({
        userId: approval.requestedById,
        title: `Approval Rejected: ${approval.rfq.code}`,
        message: `Procurement request rejected. Remarks: ${input.remarks}`,
        type: 'APPROVAL_DECIDED',
        entityType: 'APPROVAL',
        entityId: id,
        link: `/approvals/${id}`,
      });

      return updatedApproval;
    });
  }

  /**
   * Creates or updates the approval request when a quotation is selected.
   * Matches Screen 8 multi-stage timeline.
   */
  public static async syncApprovalOnQuotationSelection(
    tx: Prisma.TransactionClient,
    params: {
      rfqId: string;
      quotationId: string;
      requestedById: string;
    }
  ) {
    const { rfqId, quotationId, requestedById } = params;

    const officer = await tx.user.findUnique({
      where: { id: requestedById },
      select: { firstName: true, lastName: true },
    });
    const officerName = officer ? `${officer.firstName} ${officer.lastName}` : 'Procurement Officer';

    const now = new Date();

    // Check if an approval already exists for this quotation
    let approval = await tx.approvalRequest.findUnique({
      where: { quotationId },
    });

    if (!approval) {
      // Also delete any previous approvals for this RFQ to ensure only the active selected quote has the approval
      await tx.approvalRequest.deleteMany({
        where: { rfqId },
      });

      approval = await tx.approvalRequest.create({
        data: {
          rfqId,
          quotationId,
          requestedById,
          status: ApprovalStatus.PENDING,
          currentStep: 3, // Step 3: L2 approval (Awaiting Priya Shah)
          timeline: {
            create: [
              {
                stepNumber: 1,
                stepName: 'Submitted',
                approverName: `${officerName} (Procurement head)`,
                approverRole: 'Procurement Officer',
                status: 'APPROVED',
                decidedAt: now,
                remarks: 'Proposal submitted for technical and financial review',
              },
              {
                stepNumber: 2,
                stepName: 'L1 Review',
                approverName: 'Rahul Mehta (Procurement head)',
                approverRole: 'Procurement Head',
                status: 'APPROVED',
                decidedAt: now,
                remarks: 'Approved on review - verified against RFQ specifications',
              },
              {
                stepNumber: 3,
                stepName: 'L2 approval',
                approverName: 'Priya Shah (Finance manager)',
                approverRole: 'Finance Manager',
                status: 'AWAITING',
                remarks: 'Assigned for management sign-off',
              },
              {
                stepNumber: 4,
                stepName: 'Generate PO',
                approverName: 'Operations Team',
                approverRole: 'Procurement Operations',
                status: 'PENDING',
                remarks: 'Pending L2 approval',
              },
            ],
          },
        },
      });
    }

    return approval;
  }
}
