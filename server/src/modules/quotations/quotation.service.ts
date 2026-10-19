import { prisma } from '../../lib/prisma.js';
import {
  NotFoundError,
  ValidationError,
  RfqDeadlinePassedError,
  InvalidStateTransitionError,
  VersionConflictError,
  VendorBlockedError,
} from '../../lib/errors.js';
import { computeQuotationTotals } from './quotation.calculator.js';
import { UpsertQuotationInput } from './quotation.schemas.js';
import { AuditService } from '../audit/audit.service.js';
import { QuotationStatus, RfqStatus, VendorStatus } from '@prisma/client';

export class QuotationService {
  /**
   * Upserts a quotation for a vendor on a specified RFQ.
   * Handles line-item recalculation, optimistic locking, deadline validation,
   * snapshot revision tracking, and audit logging.
   */
  public static async upsertQuotation(params: {
    rfqId: string;
    vendorId: string;
    userId: string;
    ipAddress?: string;
    input: UpsertQuotationInput;
  }) {
    const { rfqId, vendorId, userId, ipAddress, input } = params;

    // 1. Fetch RFQ with items and verify vendor invitation
    const rfq = await prisma.rfq.findUnique({
      where: { id: rfqId },
      include: {
        items: true,
        vendors: {
          where: { vendorId },
          include: { vendor: true },
        },
      },
    });

    // Per security specs: If RFQ doesn't exist or vendor is not assigned, return 404 (prevent ID leakage)
    if (!rfq || rfq.deletedAt || rfq.vendors.length === 0) {
      throw new NotFoundError('RFQ not found or you are not invited');
    }

    const vendorAssignment = rfq.vendors[0];
    const vendor = vendorAssignment.vendor;

    // 2. Verify Vendor eligibility
    if (vendor.status === VendorStatus.BLOCKED) {
      throw new VendorBlockedError();
    }

    // 3. Verify RFQ is OPEN and deadline has not passed (effective status check)
    const now = Date.now();
    if (rfq.status !== RfqStatus.OPEN) {
      throw new InvalidStateTransitionError('Quotation can only be submitted for OPEN RFQs');
    }

    if (new Date(rfq.deadline).getTime() <= now) {
      throw new RfqDeadlinePassedError();
    }

    // 4. Validate quoted items match RFQ items
    const rfqItemMap = new Map(rfq.items.map((i) => [i.id, i]));
    for (const item of input.items) {
      if (!rfqItemMap.has(item.rfqItemId)) {
        throw new ValidationError(`Item ${item.rfqItemId} does not belong to this RFQ`);
      }
    }

    // BR-6: Complete quote required on final submission
    if (input.submit) {
      if (input.items.length < rfq.items.length) {
        throw new ValidationError('All RFQ items must be quoted before final submission');
      }
      for (const item of input.items) {
        if (item.unitPrice <= 0) {
          throw new ValidationError('Unit price must be positive for all items upon submission');
        }
      }
    }

    // 5. Compute totals with pure decimal calculator
    const calcInputs = input.items.map((item) => {
      const rfqItem = rfqItemMap.get(item.rfqItemId)!;
      return {
        rfqItemId: item.rfqItemId,
        quantity: rfqItem.quantity,
        unitPrice: item.unitPrice,
        deliveryDays: item.deliveryDays,
      };
    });

    const totals = computeQuotationTotals(calcInputs, input.taxRate);
    const finalDeliveryDays = input.deliveryDays ?? totals.maxDeliveryDays;

    // 6. Execute Upsert within transaction
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.quotation.findUnique({
        where: {
          rfqId_vendorId: { rfqId, vendorId },
        },
        include: {
          items: true,
          revisions: { orderBy: { revision: 'desc' }, take: 1 },
        },
      });

      // Optimistic concurrency check
      if (existing && input.version !== undefined && existing.version !== input.version) {
        throw new VersionConflictError();
      }

      let quotation;
      const targetStatus = input.submit ? QuotationStatus.SUBMITTED : (existing?.status ?? QuotationStatus.DRAFT);
      const isSubmittingNow = input.submit && existing?.status !== QuotationStatus.SUBMITTED;

      if (existing) {
        // Snapshot revision if quotation was previously submitted or is being updated
        const lastRev = existing.revisions[0]?.revision ?? 0;
        const newRevisionNumber = lastRev + 1;

        await tx.quotationRevision.create({
          data: {
            quotationId: existing.id,
            revision: newRevisionNumber,
            snapshot: {
              version: existing.version,
              status: existing.status,
              taxRate: existing.taxRate.toString(),
              subtotal: existing.subtotal.toString(),
              taxAmount: existing.taxAmount.toString(),
              grandTotal: existing.grandTotal.toString(),
              deliveryDays: existing.deliveryDays,
              notes: existing.notes,
              items: existing.items.map((i) => ({
                rfqItemId: i.rfqItemId,
                unitPrice: i.unitPrice.toString(),
                deliveryDays: i.deliveryDays,
                lineTotal: i.lineTotal.toString(),
              })),
            },
          },
        });

        // Delete existing items to replace with updated inputs
        await tx.quotationItem.deleteMany({
          where: { quotationId: existing.id },
        });

        // Update quotation
        quotation = await tx.quotation.update({
          where: { id: existing.id },
          data: {
            status: targetStatus,
            version: { increment: 1 },
            taxRate: totals.taxRate,
            subtotal: totals.subtotal,
            taxAmount: totals.taxAmount,
            grandTotal: totals.grandTotal,
            deliveryDays: finalDeliveryDays,
            paymentTermsDays: input.paymentTermsDays,
            notes: input.notes,
            submittedAt: input.submit ? (existing.submittedAt ?? new Date()) : existing.submittedAt,
            items: {
              create: totals.lines.map((l) => ({
                rfqItemId: l.rfqItemId,
                unitPrice: l.unitPrice,
                deliveryDays: l.deliveryDays,
                lineTotal: l.lineTotal,
              })),
            },
          },
          include: {
            items: {
              include: {
                rfqItem: true,
              },
            },
            revisions: {
              orderBy: { revision: 'desc' },
            },
          },
        });
      } else {
        // Create new Quotation
        quotation = await tx.quotation.create({
          data: {
            rfqId,
            vendorId,
            status: targetStatus,
            taxRate: totals.taxRate,
            subtotal: totals.subtotal,
            taxAmount: totals.taxAmount,
            grandTotal: totals.grandTotal,
            deliveryDays: finalDeliveryDays,
            paymentTermsDays: input.paymentTermsDays,
            notes: input.notes,
            submittedAt: input.submit ? new Date() : null,
            items: {
              create: totals.lines.map((l) => ({
                rfqItemId: l.rfqItemId,
                unitPrice: l.unitPrice,
                deliveryDays: l.deliveryDays,
                lineTotal: l.lineTotal,
              })),
            },
          },
          include: {
            items: {
              include: {
                rfqItem: true,
              },
            },
            revisions: true,
          },
        });

        // If directly submitted on creation, snapshot revision 1
        if (input.submit) {
          await tx.quotationRevision.create({
            data: {
              quotationId: quotation.id,
              revision: 1,
              snapshot: {
                version: quotation.version,
                status: quotation.status,
                taxRate: quotation.taxRate.toString(),
                subtotal: quotation.subtotal.toString(),
                taxAmount: quotation.taxAmount.toString(),
                grandTotal: quotation.grandTotal.toString(),
                deliveryDays: quotation.deliveryDays,
                notes: quotation.notes,
                items: quotation.items.map((i) => ({
                  rfqItemId: i.rfqItemId,
                  unitPrice: i.unitPrice.toString(),
                  deliveryDays: i.deliveryDays,
                  lineTotal: i.lineTotal.toString(),
                })),
              },
            },
          });
        }
      }

      // Audit Log
      await AuditService.log({
        entityType: 'Quotation',
        entityId: quotation.id,
        action: isSubmittingNow ? 'QUOTATION_SUBMITTED' : 'QUOTATION_SAVED',
        actorId: userId,
        ip: ipAddress,
        metadata: {
          rfqId,
          vendorId,
          status: quotation.status,
          grandTotal: quotation.grandTotal.toString(),
          itemsCount: quotation.items.length,
        },
      });

      return quotation;
    });
  }

  /**
   * Retrieves a quotation by RFQ and Vendor
   */
  public static async getQuotation(rfqId: string, vendorId: string) {
    return prisma.quotation.findUnique({
      where: {
        rfqId_vendorId: { rfqId, vendorId },
      },
      include: {
        items: {
          include: {
            rfqItem: true,
          },
        },
        revisions: {
          orderBy: { revision: 'desc' },
        },
      },
    });
  }

  /**
   * Lists quotations for an RFQ (Procurement Officer / Admin / Manager view)
   */
  public static async listQuotationsForRfq(rfqId: string) {
    return prisma.quotation.findMany({
      where: { rfqId },
      include: {
        vendor: true,
        items: {
          include: {
            rfqItem: true,
          },
        },
        revisions: {
          orderBy: { revision: 'desc' },
        },
      },
      orderBy: { grandTotal: 'asc' },
    });
  }
}
