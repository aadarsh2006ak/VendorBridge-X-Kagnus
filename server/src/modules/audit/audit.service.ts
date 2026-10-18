import { prisma } from '../../lib/prisma.js';

export interface CreateAuditLogParams {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}

/**
 * Write-only Audit Log Service.
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
}
