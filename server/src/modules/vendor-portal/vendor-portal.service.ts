import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { RfqService } from '../rfqs/rfq.service.js';
import { QuotationService } from '../quotations/quotation.service.js';
import { UpsertQuotationInput } from '../quotations/quotation.schemas.js';
import { RfqStatus } from '@prisma/client';

export class VendorPortalService {
  /**
   * Resolves the vendor company ID for a given vendor user.
   */
  public static async getVendorForUser(userId: string) {
    const member = await prisma.vendorMember.findUnique({
      where: { userId },
      include: { vendor: true },
    });

    if (!member || !member.vendor) {
      // Fallback check: find vendor by contact email if direct member record missing
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const vendorByEmail = await prisma.vendor.findFirst({
          where: { contactEmail: user.email },
        });
        if (vendorByEmail) {
          // Auto-link for convenience
          await prisma.vendorMember.create({
            data: {
              userId,
              vendorId: vendorByEmail.id,
            },
          });
          return vendorByEmail;
        }
      }

      throw new ForbiddenError(
        'Your user account is not linked to any registered vendor company'
      );
    }

    return member.vendor;
  }

  /**
   * Lists RFQs assigned to the calling vendor.
   * Only displays RFQs that are published (OPEN, CLOSED, QUOTATION_SELECTED).
   */
  public static async listAssignedRfqs(userId: string) {
    const vendor = await this.getVendorForUser(userId);

    const assignments = await prisma.rfqVendor.findMany({
      where: {
        vendorId: vendor.id,
        rfq: {
          deletedAt: null,
          status: {
            in: [RfqStatus.OPEN, RfqStatus.CLOSED, RfqStatus.QUOTATION_SELECTED],
          },
        },
      },
      include: {
        rfq: {
          include: {
            items: true,
            quotations: {
              where: { vendorId: vendor.id },
            },
          },
        },
      },
      orderBy: { invitedAt: 'desc' },
    });

    return assignments.map((assignment) => {
      const r = assignment.rfq;
      const q = r.quotations[0] || null;
      const effectiveStatus = RfqService.deriveEffectiveStatus(r);

      return {
        id: r.id,
        code: r.code,
        title: r.title,
        category: r.category,
        deadline: r.deadline,
        status: r.status,
        effectiveStatus,
        itemCount: r.items.length,
        invitedAt: assignment.invitedAt,
        viewedAt: assignment.viewedAt,
        quotation: q
          ? {
              id: q.id,
              status: q.status,
              grandTotal: q.grandTotal.toNumber(),
              submittedAt: q.submittedAt,
              deliveryDays: q.deliveryDays,
            }
          : null,
      };
    });
  }

  /**
   * Retrieves single RFQ details for a vendor, marking `viewedAt` if first view.
   * Strict object-level security: returns 404 if caller is not assigned to this RFQ.
   */
  public static async getAssignedRfqById(userId: string, rfqId: string) {
    const vendor = await this.getVendorForUser(userId);

    const assignment = await prisma.rfqVendor.findUnique({
      where: {
        rfqId_vendorId: {
          rfqId,
          vendorId: vendor.id,
        },
      },
      include: {
        rfq: {
          include: {
            items: {
              orderBy: { position: 'asc' },
            },
            attachments: true,
            quotations: {
              where: { vendorId: vendor.id },
              include: {
                items: true,
                revisions: {
                  orderBy: { revision: 'desc' },
                },
              },
            },
          },
        },
      },
    });

    // Security check: 404 if not found or RFQ is soft-deleted or still DRAFT
    if (!assignment || !assignment.rfq || assignment.rfq.deletedAt) {
      throw new NotFoundError('RFQ not found or you are not invited');
    }

    const r = assignment.rfq;
    if (r.status === RfqStatus.DRAFT) {
      throw new NotFoundError('RFQ not found or you are not invited');
    }

    // Atomically mark viewedAt on first access
    if (!assignment.viewedAt) {
      await prisma.rfqVendor.update({
        where: {
          rfqId_vendorId: {
            rfqId,
            vendorId: vendor.id,
          },
        },
        data: { viewedAt: new Date() },
      });
    }

    const effectiveStatus = RfqService.deriveEffectiveStatus(r);
    const q = r.quotations[0] || null;

    return {
      id: r.id,
      code: r.code,
      title: r.title,
      category: r.category,
      description: r.description,
      deadline: r.deadline,
      status: r.status,
      effectiveStatus,
      invitedAt: assignment.invitedAt,
      viewedAt: assignment.viewedAt || new Date(),
      items: r.items.map((i) => ({
        id: i.id,
        position: i.position,
        name: i.name,
        description: i.description,
        quantity: i.quantity.toNumber(),
        unit: i.unit,
      })),
      attachments: r.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        sizeBytes: a.fileSize,
        mimeType: a.mimeType,
      })),
      quotation: q
        ? {
            id: q.id,
            status: q.status,
            version: q.version,
            subtotal: q.subtotal.toNumber(),
            taxRate: q.taxRate.toNumber(),
            taxAmount: q.taxAmount.toNumber(),
            grandTotal: q.grandTotal.toNumber(),
            deliveryDays: q.deliveryDays,
            paymentTermsDays: q.paymentTermsDays,
            notes: q.notes,
            submittedAt: q.submittedAt,
            items: q.items.map((qi) => ({
              id: qi.id,
              rfqItemId: qi.rfqItemId,
              unitPrice: qi.unitPrice.toNumber(),
              deliveryDays: qi.deliveryDays,
              lineTotal: qi.lineTotal.toNumber(),
            })),
          }
        : null,
    };
  }

  /**
   * Submits or drafts a quotation from the vendor portal.
   */
  public static async submitQuotation(params: {
    userId: string;
    rfqId: string;
    input: UpsertQuotationInput;
    ipAddress?: string;
  }) {
    const vendor = await this.getVendorForUser(params.userId);

    return QuotationService.upsertQuotation({
      rfqId: params.rfqId,
      vendorId: vendor.id,
      userId: params.userId,
      ipAddress: params.ipAddress,
      input: params.input,
    });
  }
}
