import { prisma } from '../../lib/prisma.js';
import { InvoiceStatus, Prisma } from '@prisma/client';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from '../../lib/errors.js';
import { AuditService } from '../audit/audit.service.js';
import {
  ListInvoicesQuery,
  CreateInvoiceInput,
  UpdateInvoiceStatusInput,
  EmailInvoiceInput,
} from './invoice.schemas.js';
import { generateInvoicePdfBuffer } from './invoice.pdf.js';
import { sendInvoiceEmail } from '../../lib/mailer.js';

export class InvoiceService {
  /**
   * Lists invoices with role-based scoping and filtering.
   */
  public static async listInvoices(query: ListInvoicesQuery, user: { id: string; role: string }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {};

    // Vendor visibility constraint: Only see invoices for their company
    if (user.role === 'VENDOR') {
      const member = await prisma.vendorMember.findUnique({
        where: { userId: user.id },
      });
      if (!member) {
        return {
          items: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
          counts: { all: 0, pendingPayment: 0, paid: 0, cancelled: 0 },
        };
      }
      where.vendorId = member.vendorId;
    }

    if (query.status && query.status !== 'ALL') {
      where.status = query.status as InvoiceStatus;
    }

    if (query.search) {
      where.OR = [
        { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
        { vendor: { name: { contains: query.search, mode: 'insensitive' } } },
        { purchaseOrder: { poNumber: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total, pendingPaymentCount, paidCount, cancelledCount] = await Promise.all([
      prisma.invoice.findMany({
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
          purchaseOrder: {
            select: {
              id: true,
              poNumber: true,
              rfq: {
                select: {
                  code: true,
                  title: true,
                },
              },
            },
          },
          items: true,
        },
      }),
      prisma.invoice.count({ where }),
      prisma.invoice.count({ where: { ...where, status: InvoiceStatus.PENDING_PAYMENT } }),
      prisma.invoice.count({ where: { ...where, status: InvoiceStatus.PAID } }),
      prisma.invoice.count({ where: { ...where, status: InvoiceStatus.CANCELLED } }),
    ]);

    return {
      items: items.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        purchaseOrderId: inv.purchaseOrderId,
        status: inv.status,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt,
        subtotal: inv.subtotal.toNumber(),
        taxRate: inv.taxRate.toNumber(),
        cgstAmount: inv.cgstAmount.toNumber(),
        sgstAmount: inv.sgstAmount.toNumber(),
        taxAmount: inv.taxAmount.toNumber(),
        grandTotal: inv.grandTotal.toNumber(),
        vendor: inv.vendor,
        purchaseOrder: inv.purchaseOrder,
        itemsCount: inv.items.length,
        createdAt: inv.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      counts: {
        all: total,
        pendingPayment: pendingPaymentCount,
        paid: paidCount,
        cancelled: cancelledCount,
      },
    };
  }

  /**
   * Retrieves single Invoice with all details and line items (Screen 9).
   */
  public static async getInvoiceById(id: string, user: { id: string; role: string }) {
    const inv = await prisma.invoice.findUnique({
      where: { id },
      include: {
        vendor: true,
        purchaseOrder: {
          include: {
            rfq: {
              select: {
                id: true,
                code: true,
                title: true,
                category: true,
              },
            },
            items: true,
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
      },
    });

    if (!inv) {
      throw new NotFoundError('Invoice not found');
    }

    // Vendor access verification: Vendor can only view their own Invoice
    if (user.role === 'VENDOR') {
      const member = await prisma.vendorMember.findUnique({
        where: { userId: user.id },
      });
      if (!member || member.vendorId !== inv.vendorId) {
        throw new NotFoundError('Invoice not found'); // Object-level 404 security
      }
    }

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      purchaseOrderId: inv.purchaseOrderId,
      vendorId: inv.vendorId,
      status: inv.status,
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt,
      notes: inv.notes,
      buyer: {
        name: inv.buyerName,
        address: inv.buyerAddress,
        gstin: inv.buyerGstin,
      },
      vendor: {
        id: inv.vendor.id,
        name: inv.vendor.name,
        category: inv.vendor.category,
        gstin: inv.vendor.gstNumber,
        address: inv.vendor.address || '456, Industrial Estate, Surat',
        contactName: inv.vendor.contactName,
        contactEmail: inv.vendor.contactEmail,
        contactPhone: inv.vendor.contactPhone,
      },
      purchaseOrder: {
        id: inv.purchaseOrder.id,
        poNumber: inv.purchaseOrder.poNumber,
        poDate: inv.purchaseOrder.poDate,
        rfq: inv.purchaseOrder.rfq,
      },
      financials: {
        subtotal: inv.subtotal.toNumber(),
        taxRate: inv.taxRate.toNumber(),
        cgstAmount: inv.cgstAmount.toNumber(),
        sgstAmount: inv.sgstAmount.toNumber(),
        taxAmount: inv.taxAmount.toNumber(),
        grandTotal: inv.grandTotal.toNumber(),
      },
      items: inv.items.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity.toNumber(),
        unit: i.unit,
        unitPrice: i.unitPrice.toNumber(),
        lineTotal: i.lineTotal.toNumber(),
      })),
      createdBy: inv.createdBy,
      createdAt: inv.createdAt,
    };
  }

  /**
   * Generates an invoice from a valid Purchase Order.
   */
  public static async createFromPurchaseOrder(
    input: CreateInvoiceInput,
    user: { id: string; role: string },
    ipAddress?: string
  ) {
    const { purchaseOrderId } = input;

    // Check existing invoice
    const existing = await prisma.invoice.findUnique({
      where: { purchaseOrderId },
    });
    if (existing) {
      throw new ConflictError(`Invoice ${existing.invoiceNumber} already exists for this Purchase Order`);
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        items: true,
        vendor: true,
      },
    });

    if (!po) {
      throw new NotFoundError('Purchase Order not found');
    }

    return await prisma.$transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const counterKey = `INV-${year}`;
      const counter = await tx.counter.upsert({
        where: { key: counterKey },
        update: { value: { increment: 1 } },
        create: { key: counterKey, value: 1 },
      });
      const invoiceNumber = `INV-${year}-${counter.value.toString().padStart(4, '0')}`;

      // Net 30 days due date
      const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          purchaseOrderId: po.id,
          vendorId: po.vendorId,
          createdById: user.id,
          status: InvoiceStatus.PENDING_PAYMENT,
          invoiceDate: now,
          dueDate,
          notes: po.notes,
          subtotal: po.subtotal,
          taxRate: po.taxRate,
          cgstAmount: po.cgstAmount,
          sgstAmount: po.sgstAmount,
          taxAmount: po.taxAmount,
          grandTotal: po.grandTotal,
          items: {
            create: po.items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: {
          items: true,
          vendor: true,
          purchaseOrder: true,
        },
      });

      await AuditService.log({
        entityType: 'Invoice',
        entityId: invoice.id,
        action: 'INVOICE_GENERATED',
        actorId: user.id,
        ip: ipAddress,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          poNumber: po.poNumber,
          vendorName: po.vendor.name,
          grandTotal: invoice.grandTotal.toString(),
        },
      });

      return invoice;
    });
  }

  /**
   * Updates invoice status (e.g. Mark as Paid).
   */
  public static async updateStatus(
    id: string,
    input: UpdateInvoiceStatusInput,
    user: { id: string; role: string },
    ipAddress?: string
  ) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    const now = new Date();
    const paidAt =
      input.status === 'PAID'
        ? input.paymentDate
          ? new Date(input.paymentDate)
          : now
        : null;

    const notesToSet = input.paymentReference
      ? `Ref: ${input.paymentReference}${input.notes ? ' — ' + input.notes : ''}`
      : input.notes !== undefined
      ? input.notes
      : invoice.notes;

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: input.status as InvoiceStatus,
        paidAt,
        notes: notesToSet,
      },
    });

    await AuditService.log({
      entityType: 'Invoice',
      entityId: id,
      action: 'INVOICE_STATUS_UPDATED',
      actorId: user.id,
      ip: ipAddress,
      metadata: {
        oldStatus: invoice.status,
        newStatus: input.status,
        paymentReference: input.paymentReference,
      },
    });

    return updated;
  }

  /**
   * Generates high-quality PDF buffer for invoice download.
   */
  public static async getPdfBuffer(id: string, user: { id: string; role: string }): Promise<{ buffer: Buffer; filename: string }> {
    const invoice = await this.getInvoiceById(id, user);

    const pdfBuffer = await generateInvoicePdfBuffer({
      invoiceNumber: invoice.invoiceNumber,
      poNumber: invoice.purchaseOrder.poNumber,
      invoiceDate: new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      dueDate: new Date(invoice.dueDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      status: invoice.status,
      buyer: invoice.buyer,
      vendor: {
        name: invoice.vendor.name,
        address: invoice.vendor.address,
        gstin: invoice.vendor.gstin,
        contactEmail: invoice.vendor.contactEmail,
        contactPhone: invoice.vendor.contactPhone,
      },
      items: invoice.items,
      financials: invoice.financials,
    });

    return {
      buffer: pdfBuffer,
      filename: `${invoice.invoiceNumber}.pdf`,
    };
  }

  /**
   * Dispatches invoice email with generated PDF attachment.
   */
  public static async emailInvoice(
    id: string,
    input: EmailInvoiceInput,
    user: { id: string; role: string },
    ipAddress?: string
  ) {
    const invoice = await this.getInvoiceById(id, user);
    const { buffer } = await this.getPdfBuffer(id, user);

    const recipient = input.recipientEmail || invoice.vendor.contactEmail;
    if (!recipient) {
      throw new ValidationError('No recipient email available for this vendor');
    }

    const result = await sendInvoiceEmail({
      toEmail: recipient,
      invoiceNumber: invoice.invoiceNumber,
      poNumber: invoice.purchaseOrder.poNumber,
      grandTotal: invoice.financials.grandTotal,
      pdfBuffer: buffer,
    });

    await AuditService.log({
      entityType: 'Invoice',
      entityId: id,
      action: 'INVOICE_EMAILED',
      actorId: user.id,
      ip: ipAddress,
      metadata: {
        recipient,
        invoiceNumber: invoice.invoiceNumber,
        messageId: result.messageId,
      },
    });

    return {
      success: true,
      recipient,
      messageId: result.messageId,
      previewUrl: result.previewUrl,
      sentAt: new Date(),
    };
  }
}
