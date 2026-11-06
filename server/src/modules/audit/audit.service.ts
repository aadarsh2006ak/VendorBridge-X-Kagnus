import { prisma } from '../../lib/prisma.js';
import { ListAuditLogsQuery } from './audit.schemas.js';

export interface CreateAuditLogParams {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}

/**
 * Immutable Forensic Audit Log Service.
 * CRITICAL RULE: Under no circumstances may update or delete methods exist in this service.
 */
export class AuditService {
  /**
   * Record an immutable audit log entry.
   */
  public static async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          actorId: params.actorId || null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId || null,
          metadata: params.metadata ? (params.metadata as any) : undefined,
          ip: params.ip || null,
        },
      });
    } catch (error) {
      // Never crash the primary transaction if logging encounters an issue, but log error to console
      console.error('[AuditService.log Error]: Failed to write audit log entry', error);
    }
  }

  /**
   * Lists chronological audit log history with search, filtering, and pagination (Activity Timeline).
   */
  public static async listAuditLogs(query: ListAuditLogsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.entityType && query.entityType !== 'ALL') {
      where.entityType = query.entityType;
    }

    if (query.action && query.action !== 'ALL') {
      where.action = query.action;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { entityType: { contains: query.search, mode: 'insensitive' } },
        { entityId: { contains: query.search, mode: 'insensitive' } },
        { actor: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { actor: { lastName: { contains: query.search, mode: 'insensitive' } } },
        { actor: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves summary metrics across recorded actions for analytics overview.
   */
  public static async getAuditStats() {
    const now = new Date();
    const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const past7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalEvents, events24h, events7d, entityGroups] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { createdAt: { gte: past24h } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: past7d } } }),
      prisma.auditLog.groupBy({
        by: ['entityType'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    return {
      totalEvents,
      events24h,
      events7d,
      entityBreakdown: entityGroups.map((g) => ({
        entityType: g.entityType,
        count: g._count.id,
      })),
    };
  }
}
