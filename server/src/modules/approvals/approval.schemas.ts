import { z } from 'zod';

export const decideApprovalSchema = z
  .object({
    remarks: z.string().max(1000).optional(),
  })
  .strict();

export const rejectApprovalSchema = z
  .object({
    remarks: z.string().min(3, 'Remarks are required when rejecting an approval request').max(1000),
  })
  .strict();

export const listApprovalsQuerySchema = z.object({
  status: z.enum(['ALL', 'PENDING', 'APPROVED', 'REJECTED']).optional().default('ALL'),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export type DecideApprovalInput = z.infer<typeof decideApprovalSchema>;
export type RejectApprovalInput = z.infer<typeof rejectApprovalSchema>;
export type ListApprovalsQuery = z.infer<typeof listApprovalsQuerySchema>;
