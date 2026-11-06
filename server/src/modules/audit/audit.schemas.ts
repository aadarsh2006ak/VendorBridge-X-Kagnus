import { z } from 'zod';

export const listAuditLogsQuerySchema = z.object({
  entityType: z.string().optional(),
  action: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
