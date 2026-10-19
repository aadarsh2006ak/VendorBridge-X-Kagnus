import { Prisma, VendorStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AuditService } from '../audit/audit.service.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import {
  CreateVendorInput,
  UpdateVendorInput,
  VendorQueryInput,
} from './vendor.schemas.js';

export class VendorService {
  /**
   * List vendors with search, status filters, category filters, pagination, and status counts
   */
  public static async listVendors(query: VendorQueryInput) {
    const { page, limit, sortBy, order, search, status, category } = query;
    const skip = (page - 1) * limit;

    // Base criteria: exclude soft-deleted records
    const baseWhere: Prisma.VendorWhereInput = {
      deletedAt: null,
    };

    if (search) {
      baseWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { gstNumber: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      baseWhere.category = category;
    }

    // Counts across all statuses (maintains accurate numbers on filter chips)
    const [allCount, activeCount, pendingCount, blockedCount] = await Promise.all([
      prisma.vendor.count({ where: baseWhere }),
      prisma.vendor.count({ where: { ...baseWhere, status: VendorStatus.ACTIVE } }),
      prisma.vendor.count({ where: { ...baseWhere, status: VendorStatus.PENDING } }),
      prisma.vendor.count({ where: { ...baseWhere, status: VendorStatus.BLOCKED } }),
    ]);

    // Apply specific status filter to query if requested
    const itemsWhere: Prisma.VendorWhereInput = status
      ? { ...baseWhere, status }
      : baseWhere;

    const totalFiltered = status
      ? status === VendorStatus.ACTIVE
        ? activeCount
        : status === VendorStatus.PENDING
          ? pendingCount
          : blockedCount
      : allCount;

    const data = await prisma.vendor.findMany({
      where: itemsWhere,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: order,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      data,
      meta: {
        page,
        limit,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / limit) || 1,
      },
      counts: {
        all: allCount,
        active: activeCount,
        pending: pendingCount,
        blocked: blockedCount,
      },
    };
  }

  /**
   * Get vendor detail by ID
   */
  public static async getVendorById(id: string) {
    const vendor = await prisma.vendor.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundError('Vendor not found or has been removed');
    }

    return vendor;
  }

  /**
   * Create a new vendor (Admin, Procurement Officer)
   */
  public static async createVendor(
    input: CreateVendorInput,
    actorId: string,
    ip?: string
  ) {
    // Check GST uniqueness on active records
    const existing = await prisma.vendor.findFirst({
      where: {
        gstNumber: input.gstNumber,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictError(
        `A vendor with GST Number '${input.gstNumber}' already exists.`,
        [{ field: 'gstNumber', message: 'GST Number must be unique' }]
      );
    }

    const vendor = await prisma.vendor.create({
      data: {
        name: input.name,
        category: input.category,
        gstNumber: input.gstNumber,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        address: input.address,
        notes: input.notes,
        rating: input.rating !== undefined ? input.rating : null,
        status: input.status,
        createdById: actorId,
      },
    });

    await AuditService.log({
      actorId,
      action: 'VENDOR_CREATED',
      entityType: 'Vendor',
      entityId: vendor.id,
      metadata: { name: vendor.name, gstNumber: vendor.gstNumber },
      ip,
    });

    return vendor;
  }

  /**
   * Update an existing vendor (Admin, Procurement Officer)
   */
  public static async updateVendor(
    id: string,
    input: UpdateVendorInput,
    actorId: string,
    ip?: string
  ) {
    const existing = await prisma.vendor.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError('Vendor not found or has been removed');
    }

    // If changing GST number, verify uniqueness
    if (input.gstNumber && input.gstNumber !== existing.gstNumber) {
      const duplicate = await prisma.vendor.findFirst({
        where: {
          gstNumber: input.gstNumber,
          deletedAt: null,
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new ConflictError(
          `A vendor with GST Number '${input.gstNumber}' already exists.`,
          [{ field: 'gstNumber', message: 'GST Number must be unique' }]
        );
      }
    }

    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.gstNumber !== undefined && { gstNumber: input.gstNumber }),
        ...(input.contactName !== undefined && { contactName: input.contactName }),
        ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail }),
        ...(input.contactPhone !== undefined && { contactPhone: input.contactPhone }),
        ...(input.address !== undefined && { address: input.address }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.rating !== undefined && { rating: input.rating }),
        ...(input.status !== undefined && { status: input.status }),
      },
    });

    await AuditService.log({
      actorId,
      action: 'VENDOR_UPDATED',
      entityType: 'Vendor',
      entityId: updated.id,
      metadata: { changes: input },
      ip,
    });

    return updated;
  }

  /**
   * Soft delete vendor (Admin only)
   */
  public static async deleteVendor(id: string, actorId: string, ip?: string) {
    const existing = await prisma.vendor.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError('Vendor not found or has already been removed');
    }

    await prisma.vendor.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    await AuditService.log({
      actorId,
      action: 'VENDOR_DELETED',
      entityType: 'Vendor',
      entityId: id,
      metadata: { name: existing.name, gstNumber: existing.gstNumber },
      ip,
    });

    return { message: `Vendor '${existing.name}' has been successfully deleted.` };
  }
}
