import { prisma } from '../../lib/prisma.js';
import {
  NotFoundError,
  ValidationError,
  InvalidStateTransitionError,
  VersionConflictError,
} from '../../lib/errors.js';
import { RfqService } from '../rfqs/rfq.service.js';
import { AuditService } from '../audit/audit.service.js';
import { QuotationStatus, RfqStatus, VendorStatus } from '@prisma/client';

export interface ComparisonQueryOptions {
  sortBy?: 'price' | 'delivery' | 'rating' | 'submittedAt';
  order?: 'asc' | 'desc';
  maxPrice?: number;
  maxDeliveryDays?: number;
  minRating?: number;
  vendorIds?: string[];
}

export class ComparisonService {
  /**
   * Generates the Quotation Comparison Matrix for an RFQ with lowest-price highlighting (BR-10).
   */
  public static async getComparisonMatrix(rfqId: string, options: ComparisonQueryOptions = {}) {
    const rfq = await prisma.rfq.findUnique({
      where: { id: rfqId },
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
        vendors: {
          include: {
            vendor: true,
          },
        },
        quotations: {
          include: {
            items: true,
            vendor: true,
          },
        },
      },
    });

    if (!rfq || rfq.deletedAt) {
      throw new NotFoundError('RFQ not found');
    }

    const effectiveStatus = RfqService.deriveEffectiveStatus(rfq);
    const quoteMap = new Map(rfq.quotations.map((q) => [q.vendorId, q]));

    // Map all assigned vendors & their quotations
    let vendorColumns = rfq.vendors.map((rv) => {
      const v = rv.vendor;
      const q = quoteMap.get(rv.vendorId);

      let quoteData = null;
      let isComparable = false;

      if (q) {
        // Quotation is comparable if SUBMITTED, vendor not blocked, prices all items, grandTotal > 0
        const pricesAllItems = q.items.length >= rfq.items.length;
        const vendorNotBlocked = v.status !== VendorStatus.BLOCKED;
        const isSubmitted = q.status === QuotationStatus.SUBMITTED;
        const positiveTotal = q.grandTotal.toNumber() > 0;

        isComparable = isSubmitted && vendorNotBlocked && pricesAllItems && positiveTotal;

        quoteData = {
          id: q.id,
          status: q.status,
          version: q.version,
          isComparable,
          isLowestPrice: false, // Calculated below
          subtotal: q.subtotal.toNumber(),
          taxRate: q.taxRate.toNumber(),
          taxAmount: q.taxAmount.toNumber(),
          grandTotal: q.grandTotal.toNumber(),
          deliveryDays: q.deliveryDays,
          paymentTermsDays: q.paymentTermsDays,
          notes: q.notes,
          submittedAt: q.submittedAt,
          items: q.items.map((qi) => ({
            rfqItemId: qi.rfqItemId,
            unitPrice: qi.unitPrice.toNumber(),
            deliveryDays: qi.deliveryDays,
            lineTotal: qi.lineTotal.toNumber(),
            isLowestUnitPrice: false, // Calculated below
          })),
        };
      }

      return {
        vendor: {
          id: v.id,
          name: v.name,
          rating: v.rating ? Number(v.rating) : null,
          status: v.status,
          contactName: v.contactName,
          contactEmail: v.contactEmail,
          contactPhone: v.contactPhone,
        },
        quotation: quoteData,
        invitedAt: rv.invitedAt,
        viewedAt: rv.viewedAt,
      };
    });

    // Filtering by vendorIds if provided
    if (options.vendorIds && options.vendorIds.length > 0) {
      vendorColumns = vendorColumns.filter((col) => options.vendorIds!.includes(col.vendor.id));
    }

    // Filter by maxPrice
    if (options.maxPrice !== undefined) {
      vendorColumns = vendorColumns.filter(
        (col) => !col.quotation || col.quotation.grandTotal <= options.maxPrice!
      );
    }

    // Filter by maxDeliveryDays
    if (options.maxDeliveryDays !== undefined) {
      vendorColumns = vendorColumns.filter(
        (col) => !col.quotation || (col.quotation.deliveryDays !== null && col.quotation.deliveryDays <= options.maxDeliveryDays!)
      );
    }

    // Filter by minRating
    if (options.minRating !== undefined) {
      vendorColumns = vendorColumns.filter(
        (col) => col.vendor.rating === null || col.vendor.rating >= options.minRating!
      );
    }

    // Calculate Lowest Grand Total among comparable quotations (BR-10)
    const comparableQuotes = vendorColumns
      .map((col) => col.quotation)
      .filter((q): q is NonNullable<typeof q> => q !== null && q.isComparable);

    let lowestGrandTotal: number | null = null;
    let lowestDeliveryDays: number | null = null;

    if (comparableQuotes.length > 0) {
      lowestGrandTotal = Math.min(...comparableQuotes.map((q) => q.grandTotal));
      const validDeliveryDays = comparableQuotes
        .map((q) => q.deliveryDays)
        .filter((d): d is number => d !== null);
      if (validDeliveryDays.length > 0) {
        lowestDeliveryDays = Math.min(...validDeliveryDays);
      }

      // Mark isLowestPrice
      for (const col of vendorColumns) {
        if (col.quotation && col.quotation.isComparable && col.quotation.grandTotal === lowestGrandTotal) {
          col.quotation.isLowestPrice = true;
        }
      }
    }

    // Calculate Lowest Unit Price per Line Item
    const itemLowestUnitPriceMap = new Map<string, number>();
    for (const rfqItem of rfq.items) {
      const unitPrices = comparableQuotes
        .flatMap((q) => q.items.filter((qi) => qi.rfqItemId === rfqItem.id))
        .map((qi) => qi.unitPrice);

      if (unitPrices.length > 0) {
        itemLowestUnitPriceMap.set(rfqItem.id, Math.min(...unitPrices));
      }
    }

    for (const col of vendorColumns) {
      if (col.quotation) {
        for (const item of col.quotation.items) {
          const lowest = itemLowestUnitPriceMap.get(item.rfqItemId);
          if (lowest !== undefined && item.unitPrice === lowest) {
            item.isLowestUnitPrice = true;
          }
        }
      }
    }

    // Sorting columns
    const sortBy = options.sortBy || 'price';
    const order = options.order || 'asc';
    const direction = order === 'asc' ? 1 : -1;

    vendorColumns.sort((a, b) => {
      // Put submitted quotations first
      if (a.quotation && !b.quotation) return -1;
      if (!a.quotation && b.quotation) return 1;
      if (!a.quotation && !b.quotation) return 0;

      const qa = a.quotation!;
      const qb = b.quotation!;

      if (sortBy === 'price') {
        return (qa.grandTotal - qb.grandTotal) * direction;
      }
      if (sortBy === 'delivery') {
        const da = qa.deliveryDays ?? 999999;
        const db = qb.deliveryDays ?? 999999;
        return (da - db) * direction;
      }
      if (sortBy === 'rating') {
        const ra = a.vendor.rating ?? -1;
        const rb = b.vendor.rating ?? -1;
        return (ra - rb) * direction;
      }
      if (sortBy === 'submittedAt') {
        const sa = qa.submittedAt ? new Date(qa.submittedAt).getTime() : 0;
        const sb = qb.submittedAt ? new Date(qb.submittedAt).getTime() : 0;
        return (sa - sb) * direction;
      }
      return 0;
    });

    return {
      rfq: {
        id: rfq.id,
        code: rfq.code,
        title: rfq.title,
        category: rfq.category,
        description: rfq.description,
        status: rfq.status,
        effectiveStatus,
        deadline: rfq.deadline,
        version: rfq.version,
        selectedQuotationId: rfq.selectedQuotationId,
        selectedAt: rfq.selectedAt,
      },
      items: rfq.items.map((i) => ({
        id: i.id,
        position: i.position,
        name: i.name,
        description: i.description,
        quantity: i.quantity.toNumber(),
        unit: i.unit,
        lowestUnitPrice: itemLowestUnitPriceMap.get(i.id) ?? null,
      })),
      vendors: vendorColumns,
      summary: {
        totalAssignedVendors: rfq.vendors.length,
        totalSubmittedQuotes: comparableQuotes.length,
        lowestGrandTotal,
        lowestDeliveryDays,
      },
    };
  }

  /**
   * Selects a winning quotation for an RFQ (transitions status to QUOTATION_SELECTED).
   */
  public static async selectQuotation(params: {
    rfqId: string;
    quotationId: string;
    version: number;
    userId: string;
    ipAddress?: string;
  }) {
    const { rfqId, quotationId, version, userId, ipAddress } = params;

    const rfq = await prisma.rfq.findUnique({
      where: { id: rfqId },
    });

    if (!rfq || rfq.deletedAt) {
      throw new NotFoundError('RFQ not found');
    }

    if (rfq.version !== version) {
      throw new VersionConflictError();
    }

    const effectiveStatus = RfqService.deriveEffectiveStatus(rfq);
    if (
      effectiveStatus !== RfqStatus.OPEN &&
      effectiveStatus !== RfqStatus.CLOSED &&
      effectiveStatus !== RfqStatus.QUOTATION_SELECTED
    ) {
      throw new InvalidStateTransitionError(
        `Cannot select quotation for RFQ with status ${rfq.status}`
      );
    }

    // Verify quotation exists, belongs to this RFQ, and is SUBMITTED
    const quotation = await prisma.quotation.findFirst({
      where: {
        id: quotationId,
        rfqId,
      },
      include: {
        vendor: true,
      },
    });

    if (!quotation) {
      throw new NotFoundError('Quotation not found for this RFQ');
    }

    if (quotation.status !== QuotationStatus.SUBMITTED) {
      throw new ValidationError('Only SUBMITTED quotations can be selected');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedRfq = await tx.rfq.update({
        where: { id: rfqId },
        data: {
          status: RfqStatus.QUOTATION_SELECTED,
          selectedQuotationId: quotationId,
          selectedById: userId,
          selectedAt: new Date(),
          version: { increment: 1 },
        },
        include: {
          items: true,
          vendors: { include: { vendor: true } },
        },
      });

      await AuditService.log({
        entityType: 'Rfq',
        entityId: rfqId,
        action: 'QUOTATION_SELECTED',
        actorId: userId,
        ip: ipAddress,
        metadata: {
          selectedQuotationId: quotationId,
          vendorName: quotation.vendor.name,
          grandTotal: quotation.grandTotal.toString(),
        },
      });

      return updatedRfq;
    });

    return updated;
  }

  /**
   * Clears the selection of an RFQ quotation (reverts status to CLOSED or OPEN).
   */
  public static async clearSelection(params: {
    rfqId: string;
    version: number;
    userId: string;
    ipAddress?: string;
  }) {
    const { rfqId, version, userId, ipAddress } = params;

    const rfq = await prisma.rfq.findUnique({
      where: { id: rfqId },
    });

    if (!rfq || rfq.deletedAt) {
      throw new NotFoundError('RFQ not found');
    }

    if (rfq.version !== version) {
      throw new VersionConflictError();
    }

    if (rfq.status !== RfqStatus.QUOTATION_SELECTED) {
      throw new InvalidStateTransitionError('RFQ does not have a selected quotation');
    }

    const newStatus = new Date(rfq.deadline).getTime() > Date.now() ? RfqStatus.OPEN : RfqStatus.CLOSED;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedRfq = await tx.rfq.update({
        where: { id: rfqId },
        data: {
          status: newStatus,
          selectedQuotationId: null,
          selectedById: null,
          selectedAt: null,
          version: { increment: 1 },
        },
      });

      await AuditService.log({
        entityType: 'Rfq',
        entityId: rfqId,
        action: 'QUOTATION_SELECTION_CLEARED',
        actorId: userId,
        ip: ipAddress,
        metadata: {
          previousStatus: rfq.status,
          newStatus,
        },
      });

      return updatedRfq;
    });

    return updated;
  }
}
