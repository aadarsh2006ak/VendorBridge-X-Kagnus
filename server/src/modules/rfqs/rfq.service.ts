import { RfqStatus, VendorStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  VersionConflictError,
  InvalidStateTransitionError,
} from '../../lib/errors.js';
import { AuditService } from '../audit/audit.service.js';
import {
  CreateRfqInput,
  UpdateRfqInput,
  RfqQueryInput,
  CancelRfqInput,
  ReopenRfqInput,
} from './rfq.schemas.js';

export class RfqService {
  /**
   * BR-1: Generates human-readable, atomic RFQ code: RFQ-YYYY-NNNN.
   */
  public static async getNextRfqCode(year: number = new Date().getFullYear()): Promise<string> {
    const key = `rfq:${year}`;
    const counter = await prisma.counter.upsert({
      where: { key },
      update: { value: { increment: 1 } },
      create: { key, value: 1 },
    });
    const seqStr = counter.value.toString().padStart(4, '0');
    return `RFQ-${year}-${seqStr}`;
  }

  /**
   * BR-14: Derives effective RFQ status on read (OPEN becomes CLOSED if deadline passed).
   */
  public static deriveEffectiveStatus(
    statusOrRfq: RfqStatus | { status: RfqStatus; deadline: Date },
    maybeDeadline?: Date
  ): RfqStatus {
    const status = typeof statusOrRfq === 'string' ? statusOrRfq : statusOrRfq.status;
    const deadline = typeof statusOrRfq === 'string' ? maybeDeadline! : statusOrRfq.deadline;
    if (status === RfqStatus.OPEN && new Date().getTime() >= new Date(deadline).getTime()) {
      return RfqStatus.CLOSED;
    }
    return status;
  }

  /**
   * Creates a new RFQ (Draft or immediately Published).
   */
  public static async createRfq(input: CreateRfqInput, userId: string, ip?: string) {
    // BR-2: Only Active vendors may be assigned
    if (input.assignedVendorIds.length > 0) {
      const activeVendors = await prisma.vendor.findMany({
        where: {
          id: { in: input.assignedVendorIds },
          status: VendorStatus.ACTIVE,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (activeVendors.length !== input.assignedVendorIds.length) {
        throw new ValidationError(
          'Only vendors with status Active may be assigned to an RFQ. Please remove pending or blocked vendors.'
        );
      }
    }

    const code = await this.getNextRfqCode();
    const isPublishing = input.publish;
    const initialStatus = isPublishing ? RfqStatus.OPEN : RfqStatus.DRAFT;
    const now = new Date();

    const rfq = await prisma.$transaction(async (tx) => {
      const created = await tx.rfq.create({
        data: {
          code,
          title: input.title,
          category: input.category,
          description: input.description,
          deadline: input.deadline,
          status: initialStatus,
          publishedAt: isPublishing ? now : null,
          createdById: userId,
          items: {
            create: input.items.map((item, index) => ({
              position: index + 1,
              name: item.name,
              description: item.description,
              quantity: new Prisma.Decimal(item.quantity),
              unit: item.unit,
            })),
          },
          vendors: {
            create: input.assignedVendorIds.map((vendorId) => ({
              vendorId,
              invitedAt: now,
            })),
          },
        },
        include: {
          items: true,
          vendors: {
            include: {
              vendor: true,
            },
          },
        },
      });

      return created;
    });

    await AuditService.log({
      actorId: userId,
      action: isPublishing ? 'RFQ_PUBLISHED' : 'RFQ_CREATED',
      entityType: 'Rfq',
      entityId: rfq.id,
      metadata: { code: rfq.code, status: rfq.status, vendorsCount: input.assignedVendorIds.length },
      ip,
    });

    return {
      ...rfq,
      effectiveStatus: this.deriveEffectiveStatus(rfq.status, rfq.deadline),
    };
  }

  /**
   * Lists RFQs with search, status & category filtering, pagination, and status chip counts.
   */
  public static async listRfqs(query: RfqQueryInput) {
    const { page, limit, search, status, category, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RfqWhereInput = {
      deletedAt: null,
      ...(status && { status }),
      ...(category && { category }),
      ...(search && {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [rfqs, total, statusCounts] = await Promise.all([
      prisma.rfq.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdBy: { select: { firstName: true, lastName: true, email: true } },
          items: { select: { id: true, name: true, quantity: true, unit: true } },
          vendors: {
            select: {
              vendorId: true,
              viewedAt: true,
              vendor: { select: { id: true, name: true, status: true } },
            },
          },
          quotations: {
            select: {
              id: true,
              vendorId: true,
              status: true,
              grandTotal: true,
            },
          },
        },
      }),
      prisma.rfq.count({ where }),
      prisma.rfq.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { status: true },
      }),
    ]);

    const counts = {
      all: 0,
      draft: 0,
      open: 0,
      closed: 0,
      quotation_selected: 0,
      cancelled: 0,
    };

    for (const sc of statusCounts) {
      counts.all += sc._count.status;
      if (sc.status === RfqStatus.DRAFT) counts.draft = sc._count.status;
      if (sc.status === RfqStatus.OPEN) counts.open = sc._count.status;
      if (sc.status === RfqStatus.CLOSED) counts.closed = sc._count.status;
      if (sc.status === RfqStatus.QUOTATION_SELECTED) counts.quotation_selected = sc._count.status;
      if (sc.status === RfqStatus.CANCELLED) counts.cancelled = sc._count.status;
    }

    const data = rfqs.map((rfq) => ({
      ...rfq,
      effectiveStatus: this.deriveEffectiveStatus(rfq.status, rfq.deadline),
      vendorsCount: rfq.vendors.length,
      quotesCount: rfq.quotations.filter((q) => q.status === 'SUBMITTED').length,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      counts,
    };
  }

  /**
   * Retrieves single RFQ detail with items, vendors, and quotation status.
   */
  public static async getRfqById(id: string) {
    const rfq = await prisma.rfq.findFirst({
      where: { id, deletedAt: null },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        selectedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: { orderBy: { position: 'asc' } },
        attachments: true,
        vendors: {
          include: {
            vendor: true,
          },
        },
        quotations: {
          include: {
            vendor: { select: { id: true, name: true, rating: true } },
          },
        },
      },
    });

    if (!rfq) {
      throw new NotFoundError('RFQ not found');
    }

    const effectiveStatus = this.deriveEffectiveStatus(rfq.status, rfq.deadline);

    // Map vendor assignment status
    const assignedVendors = rfq.vendors.map((rv) => {
      const vendorQuote = rfq.quotations.find((q) => q.vendorId === rv.vendorId);
      let assignmentStatus: 'INVITED' | 'VIEWED' | 'QUOTED' = 'INVITED';
      if (vendorQuote && vendorQuote.status === 'SUBMITTED') {
        assignmentStatus = 'QUOTED';
      } else if (rv.viewedAt) {
        assignmentStatus = 'VIEWED';
      }

      return {
        vendorId: rv.vendorId,
        vendorName: rv.vendor.name,
        category: rv.vendor.category,
        invitedAt: rv.invitedAt,
        viewedAt: rv.viewedAt,
        status: assignmentStatus,
        hasQuotation: !!vendorQuote,
        quotationStatus: vendorQuote ? vendorQuote.status : null,
      };
    });

    return {
      ...rfq,
      effectiveStatus,
      assignedVendors,
    };
  }

  /**
   * Updates an RFQ with optimistic concurrency control (version).
   */
  public static async updateRfq(
    id: string,
    input: UpdateRfqInput,
    userId: string,
    userRole: string,
    ip?: string
  ) {
    const rfq = await prisma.rfq.findFirst({
      where: { id, deletedAt: null },
      include: { vendors: true },
    });

    if (!rfq) {
      throw new NotFoundError('RFQ not found');
    }

    // Ownership check: Officer can edit only their own RFQs (Admin can edit any)
    if (userRole === 'PROCUREMENT_OFFICER' && rfq.createdById !== userId) {
      throw new ForbiddenError('You can only edit your own RFQs');
    }

    // Optimistic locking check
    if (rfq.version !== input.version) {
      throw new VersionConflictError();
    }

    // BR-13: Status-specific field rules
    if (rfq.status === RfqStatus.OPEN) {
      if (input.items && input.items.length > 0) {
        throw new ValidationError('Line items on an OPEN RFQ cannot be modified because quotations may have been submitted.');
      }
      if (input.deadline && new Date(input.deadline).getTime() < new Date(rfq.deadline).getTime()) {
        throw new ValidationError('The deadline of an OPEN RFQ can only be extended, never shortened.');
      }
    } else if (rfq.status !== RfqStatus.DRAFT) {
      throw new ValidationError(`RFQs with status '${rfq.status}' cannot be modified.`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // If line items updated and status is DRAFT, replace them
      if (input.items && rfq.status === RfqStatus.DRAFT) {
        await tx.rfqItem.deleteMany({ where: { rfqId: id } });
        await tx.rfqItem.createMany({
          data: input.items.map((item, index) => ({
            rfqId: id,
            position: index + 1,
            name: item.name,
            description: item.description,
            quantity: new Prisma.Decimal(item.quantity),
            unit: item.unit,
          })),
        });
      }

      // If assigned vendors updated, add new ones (BR-15: only active vendors)
      if (input.assignedVendorIds) {
        const existingIds = rfq.vendors.map((v) => v.vendorId);
        const newIds = input.assignedVendorIds.filter((vId) => !existingIds.includes(vId));

        if (newIds.length > 0) {
          const activeCheck = await tx.vendor.findMany({
            where: { id: { in: newIds }, status: VendorStatus.ACTIVE, deletedAt: null },
            select: { id: true },
          });

          if (activeCheck.length !== newIds.length) {
            throw new ValidationError('Only Active vendors may be assigned.');
          }

          await tx.rfqVendor.createMany({
            data: newIds.map((vId) => ({
              rfqId: id,
              vendorId: vId,
              invitedAt: new Date(),
            })),
          });
        }
      }

      return tx.rfq.update({
        where: { id },
        data: {
          ...(input.title && { title: input.title }),
          ...(input.category && { category: input.category }),
          ...(input.deadline && { deadline: input.deadline }),
          ...(input.description !== undefined && { description: input.description }),
          version: { increment: 1 },
        },
        include: {
          items: true,
          vendors: { include: { vendor: true } },
        },
      });
    });

    await AuditService.log({
      actorId: userId,
      action: 'RFQ_UPDATED',
      entityType: 'Rfq',
      entityId: id,
      ip,
    });

    return {
      ...updated,
      effectiveStatus: this.deriveEffectiveStatus(updated.status, updated.deadline),
    };
  }

  /**
   * Publishes an RFQ (transitions from DRAFT to OPEN).
   */
  public static async publishRfq(id: string, userId: string, userRole: string, ip?: string) {
    const rfq = await prisma.rfq.findFirst({
      where: { id, deletedAt: null },
      include: { items: true, vendors: true },
    });

    if (!rfq) throw new NotFoundError('RFQ not found');

    if (userRole === 'PROCUREMENT_OFFICER' && rfq.createdById !== userId) {
      throw new ForbiddenError('You can only publish your own RFQs');
    }

    if (rfq.status !== RfqStatus.DRAFT) {
      throw new InvalidStateTransitionError(`Only DRAFT RFQs can be published. Current status is ${rfq.status}`);
    }

    // BR-3 checks
    if (rfq.items.length === 0) throw new ValidationError('Cannot publish RFQ without line items');
    if (rfq.vendors.length === 0) throw new ValidationError('Cannot publish RFQ without assigned vendors');
    if (new Date(rfq.deadline).getTime() <= Date.now()) {
      throw new ValidationError('Cannot publish RFQ with a deadline in the past');
    }

    const updated = await prisma.rfq.update({
      where: { id },
      data: {
        status: RfqStatus.OPEN,
        publishedAt: new Date(),
        version: { increment: 1 },
      },
    });

    await AuditService.log({
      actorId: userId,
      action: 'RFQ_PUBLISHED',
      entityType: 'Rfq',
      entityId: id,
      ip,
    });

    return updated;
  }

  /**
   * Closes an OPEN RFQ.
   */
  public static async closeRfq(id: string, userId: string, userRole: string, ip?: string) {
    const rfq = await prisma.rfq.findFirst({ where: { id, deletedAt: null } });
    if (!rfq) throw new NotFoundError('RFQ not found');

    if (userRole === 'PROCUREMENT_OFFICER' && rfq.createdById !== userId) {
      throw new ForbiddenError('You can only close your own RFQs');
    }

    if (rfq.status !== RfqStatus.OPEN) {
      throw new InvalidStateTransitionError(`Only OPEN RFQs can be closed. Current status is ${rfq.status}`);
    }

    const updated = await prisma.rfq.update({
      where: { id },
      data: {
        status: RfqStatus.CLOSED,
        closedAt: new Date(),
        version: { increment: 1 },
      },
    });

    await AuditService.log({
      actorId: userId,
      action: 'RFQ_CLOSED',
      entityType: 'Rfq',
      entityId: id,
      ip,
    });

    return updated;
  }

  /**
   * Cancels an RFQ with a required cancellation reason.
   */
  public static async cancelRfq(id: string, input: CancelRfqInput, userId: string, userRole: string, ip?: string) {
    const rfq = await prisma.rfq.findFirst({ where: { id, deletedAt: null } });
    if (!rfq) throw new NotFoundError('RFQ not found');

    if (userRole === 'PROCUREMENT_OFFICER' && rfq.createdById !== userId) {
      throw new ForbiddenError('You can only cancel your own RFQs');
    }

    if (rfq.status === RfqStatus.CANCELLED) {
      throw new ValidationError('This RFQ is already cancelled');
    }

    const updated = await prisma.rfq.update({
      where: { id },
      data: {
        status: RfqStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: input.reason,
        version: { increment: 1 },
      },
    });

    await AuditService.log({
      actorId: userId,
      action: 'RFQ_CANCELLED',
      entityType: 'Rfq',
      entityId: id,
      metadata: { reason: input.reason },
      ip,
    });

    return updated;
  }

  /**
   * Reopens a CLOSED RFQ by setting a new future deadline.
   */
  public static async reopenRfq(id: string, input: ReopenRfqInput, userId: string, userRole: string, ip?: string) {
    const rfq = await prisma.rfq.findFirst({ where: { id, deletedAt: null } });
    if (!rfq) throw new NotFoundError('RFQ not found');

    if (userRole === 'PROCUREMENT_OFFICER' && rfq.createdById !== userId) {
      throw new ForbiddenError('You can only reopen your own RFQs');
    }

    if (rfq.status !== RfqStatus.CLOSED) {
      throw new InvalidStateTransitionError(`Only CLOSED RFQs can be reopened. Current status is ${rfq.status}`);
    }

    const updated = await prisma.rfq.update({
      where: { id },
      data: {
        status: RfqStatus.OPEN,
        deadline: input.deadline,
        version: { increment: 1 },
      },
    });

    await AuditService.log({
      actorId: userId,
      action: 'RFQ_REOPENED',
      entityType: 'Rfq',
      entityId: id,
      metadata: { newDeadline: input.deadline },
      ip,
    });

    return updated;
  }

  /**
   * Soft-deletes a DRAFT RFQ (Admin and creator only).
   */
  public static async deleteRfq(id: string, userId: string, userRole: string, ip?: string) {
    const rfq = await prisma.rfq.findFirst({ where: { id, deletedAt: null } });
    if (!rfq) throw new NotFoundError('RFQ not found');

    if (rfq.status !== RfqStatus.DRAFT) {
      throw new ValidationError('Only DRAFT RFQs can be deleted');
    }

    if (userRole !== 'ADMIN' && rfq.createdById !== userId) {
      throw new ForbiddenError('You can only delete your own draft RFQs');
    }

    await prisma.rfq.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await AuditService.log({
      actorId: userId,
      action: 'RFQ_DELETED',
      entityType: 'Rfq',
      entityId: id,
      ip,
    });

    return { message: 'RFQ deleted successfully' };
  }
}
