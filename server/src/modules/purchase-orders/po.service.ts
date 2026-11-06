import { prisma } from '../../lib/prisma.js';
import { PoStatus, QuotationStatus, Prisma } from '@prisma/client';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from '../../lib/errors.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationService } from '../notifications/notification.service.js';
import { ListPoQuery, CreatePoInput } from './po.schemas.js';

export class PurchaseOrderService {
  /**
   * Lists purchase orders with role-based scoping and filtering.
   */
  public static async listPurchaseOrders(query: ListPoQuery, user: { id: string; role: string }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseOrderWhereInput = {};

    // Vendor visibility constraint: Only see POs assigned to their company
    if (user.role === 'VENDOR') {
      const member = await prisma.vendorMember.findUnique({
        where: { userId: user.id },
      });
      if (!member) {
        return {
          items: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
          counts: { all: 0, issued: 0, confirmed: 0, delivered: 0, cancelled: 0 },
        };
      }
      where.vendorId = member.vendorId;
    }

    if (query.status && query.status !== 'ALL') {
      where.status = query.status as PoStatus;
    }

    if (query.search) {
      where.OR = [
        { poNumber: { contains: query.search, mode: 'insensitive' } },
        { vendor: { name: { contains: query.search, mode: 'insensitive' } } },
        { rfq: { title: { contains: query.search, mode: 'insensitive' } } },
        { rfq: { code: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total, issuedCount, confirmedCount, deliveredCount, cancelledCount] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              category: true,
              gstNumber: true,
              rating: true,
            },
          },
          rfq: {
            select: {
              id: true,
              code: true,
              title: true,
              category: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
            },
          },
          items: {
            select: {
              id: true,
              name: true,
              quantity: true,
              unit: true,
              unitPrice: true,
              lineTotal: true,
            },
          },
        },
      }),
      prisma.purchaseOrder.count({ where }),
      prisma.purchaseOrder.count({ where: { ...where, status: PoStatus.ISSUED } }),
      prisma.purchaseOrder.count({ where: { ...where, status: PoStatus.CONFIRMED } }),
      prisma.purchaseOrder.count({ where: { ...where, status: PoStatus.DELIVERED } }),
      prisma.purchaseOrder.count({ where: { ...where, status: PoStatus.CANCELLED } }),
    ]);

    return {
      items: items.map((po) => ({
        id: po.id,
        poNumber: po.poNumber,
        rfqId: po.rfqId,
        quotationId: po.quotationId,
        status: po.status,
        poDate: po.poDate,
        deliveryDate: po.deliveryDate,
        paymentTerms: po.paymentTerms,
        subtotal: po.subtotal.toNumber(),
        taxRate: po.taxRate.toNumber(),
        cgstAmount: po.cgstAmount.toNumber(),
        sgstAmount: po.sgstAmount.toNumber(),
        taxAmount: po.taxAmount.toNumber(),
        grandTotal: po.grandTotal.toNumber(),
        vendor: po.vendor,
        rfq: po.rfq,
        invoice: po.invoice,
        itemsCount: po.items.length,
        createdAt: po.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      counts: {
        all: total,
        issued: issuedCount,
        confirmed: confirmedCount,
        delivered: deliveredCount,
        cancelled: cancelledCount,
      },
    };
  }

  /**
   * Retrieves single Purchase Order with complete line items, vendor, buyer, and invoice details (Screen 9).
   */
  public static async getPurchaseOrderById(id: string, user: { id: string; role: string }) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        rfq: {
          select: {
            id: true,
            code: true,
            title: true,
            category: true,
            description: true,
          },
        },
        quotation: {
          select: {
            id: true,
            deliveryDays: true,
            paymentTermsDays: true,
            notes: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        items: true,
        invoice: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!po) {
      throw new NotFoundError('Purchase Order not found');
    }

    // Vendor access verification: Vendor can only view their own PO
    if (user.role === 'VENDOR') {
      const member = await prisma.vendorMember.findUnique({
        where: { userId: user.id },
      });
      if (!member || member.vendorId !== po.vendorId) {
        throw new NotFoundError('Purchase Order not found'); // Object-level 404 security
      }
    }

    return {
      id: po.id,
      poNumber: po.poNumber,
      rfqId: po.rfqId,
      quotationId: po.quotationId,
      vendorId: po.vendorId,
      status: po.status,
      poDate: po.poDate,
      deliveryDate: po.deliveryDate,
      paymentTerms: po.paymentTerms,
      notes: po.notes,
      buyer: {
        name: po.buyerName,
        address: po.buyerAddress,
        gstin: po.buyerGstin,
      },
      vendor: {
        id: po.vendor.id,
        name: po.vendor.name,
        category: po.vendor.category,
        gstin: po.vendor.gstNumber,
        address: po.vendor.address || '456, Industrial Estate, Surat',
        contactName: po.vendor.contactName,
        contactEmail: po.vendor.contactEmail,
        contactPhone: po.vendor.contactPhone,
      },
      rfq: po.rfq,
      quotation: po.quotation,
      createdBy: po.createdBy,
      financials: {
        subtotal: po.subtotal.toNumber(),
        taxRate: po.taxRate.toNumber(),
        cgstAmount: po.cgstAmount.toNumber(),
        sgstAmount: po.sgstAmount.toNumber(),
        taxAmount: po.taxAmount.toNumber(),
        grandTotal: po.grandTotal.toNumber(),
      },
      items: po.items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        quantity: i.quantity.toNumber(),
        unit: i.unit,
        unitPrice: i.unitPrice.toNumber(),
        lineTotal: i.lineTotal.toNumber(),
      })),
      invoice: po.invoice
        ? {
            id: po.invoice.id,
            invoiceNumber: po.invoice.invoiceNumber,
            status: po.invoice.status,
            invoiceDate: po.invoice.invoiceDate,
            dueDate: po.invoice.dueDate,
            paidAt: po.invoice.paidAt,
            grandTotal: po.invoice.grandTotal.toNumber(),
          }
        : null,
      createdAt: po.createdAt,
    };
  }

  /**
   * Generates a Purchase Order from an APPROVED quotation.
   * Enforces that the quotation is approved and that no PO already exists.
   */
  public static async createFromQuotation(
    input: CreatePoInput,
    user: { id: string; role: string },
    ipAddress?: string
  ) {
    const { quotationId } = input;

    // Check existing PO
    const existingPo = await prisma.purchaseOrder.findUnique({
      where: { quotationId },
    });
    if (existingPo) {
      throw new ConflictError(`Purchase Order ${existingPo.poNumber} already exists for this quotation`);
    }

    // Verify quotation is approved
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        rfq: { include: { items: true } },
        vendor: true,
        items: { include: { rfqItem: true } },
      },
    });

    if (!quotation) {
      throw new NotFoundError('Quotation not found');
    }

    if (quotation.status !== QuotationStatus.APPROVED) {
      throw new ValidationError(
        `Cannot generate Purchase Order for unapproved quotation (status: ${quotation.status}). Quotation must be APPROVED.`
      );
    }

    return await prisma.$transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const counterKey = `PO-${year}`;
      const counter = await tx.counter.upsert({
        where: { key: counterKey },
        update: { value: { increment: 1 } },
        create: { key: counterKey, value: 1 },
      });
      const poNumber = `PO-${year}-${counter.value.toString().padStart(4, '0')}`;

      const leadDays = quotation.deliveryDays || 14;
      const deliveryDate = new Date(now.getTime() + leadDays * 24 * 60 * 60 * 1000);
      const halfTax = quotation.taxAmount.dividedBy(2);

      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          rfqId: quotation.rfqId,
          quotationId,
          vendorId: quotation.vendorId,
          createdById: user.id,
          status: PoStatus.ISSUED,
          poDate: now,
          deliveryDate,
          paymentTerms: quotation.paymentTermsDays
            ? `${quotation.paymentTermsDays} days net`
            : '30 days net',
          notes: quotation.notes,
          subtotal: quotation.subtotal,
          taxRate: quotation.taxRate,
          cgstAmount: halfTax,
          sgstAmount: halfTax,
          taxAmount: quotation.taxAmount,
          grandTotal: quotation.grandTotal,
          items: {
            create: quotation.items.map((item) => ({
              name: item.rfqItem.name,
              description: item.rfqItem.description,
              quantity: item.rfqItem.quantity,
              unit: item.rfqItem.unit,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: {
          items: true,
          vendor: true,
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
          rfqId: quotation.rfqId,
          vendorName: quotation.vendor.name,
          grandTotal: po.grandTotal.toString(),
        },
      });

      // Notify vendor
      await NotificationService.notifyVendorMembers(quotation.vendorId, {
        title: `Purchase Order Issued: ${po.poNumber}`,
        message: `Purchase order ${po.poNumber} has been issued to your company for quotation.`,
        type: 'PO_GENERATED',
        entityType: 'PURCHASE_ORDER',
        entityId: po.id,
        link: `/purchase-orders/${po.id}`,
      });

      return po;
    });
  }
}
