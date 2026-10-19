import { z } from 'zod';
import { RfqStatus } from '@prisma/client';

export const rfqLineItemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Item name is required').max(100),
  description: z.string().max(500).optional(),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unit: z.string().min(1, 'Unit is required').max(20),
});

export type RfqLineItemInput = z.infer<typeof rfqLineItemSchema>;

export const createRfqSchema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(150),
    category: z.string().min(1, 'Category is required').max(50),
    deadline: z.coerce.date({ invalid_type_error: 'Invalid deadline date' }),
    description: z.string().max(2000).optional(),
    items: z.array(rfqLineItemSchema).max(50, 'Maximum 50 line items allowed').default([]),
    assignedVendorIds: z.array(z.string().uuid('Invalid vendor ID')).max(20, 'Maximum 20 vendors allowed').default([]),
    publish: z.boolean().default(false),
  })
  .strict()
  .superRefine((data, ctx) => {
    // BR-3: If publishing immediately, must have ≥1 line item, ≥1 vendor, and future deadline
    if (data.publish) {
      if (data.items.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one line item is required to publish an RFQ',
          path: ['items'],
        });
      }
      if (data.assignedVendorIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one vendor must be assigned to publish an RFQ',
          path: ['assignedVendorIds'],
        });
      }
      if (new Date(data.deadline).getTime() <= Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Deadline must be in the future to publish an RFQ',
          path: ['deadline'],
        });
      }
    }
  });

export type CreateRfqInput = z.infer<typeof createRfqSchema>;

export const updateRfqSchema = z
  .object({
    title: z.string().min(3).max(150).optional(),
    category: z.string().min(1).max(50).optional(),
    deadline: z.coerce.date().optional(),
    description: z.string().max(2000).optional(),
    items: z.array(rfqLineItemSchema).max(50).optional(),
    assignedVendorIds: z.array(z.string().uuid()).max(20).optional(),
    version: z.number().int().min(1, 'Version is required for optimistic concurrency control'),
  })
  .strict();

export type UpdateRfqInput = z.infer<typeof updateRfqSchema>;

export const rfqQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.nativeEnum(RfqStatus).optional(),
  category: z.string().optional(),
  sortBy: z.enum(['createdAt', 'deadline', 'title', 'code', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type RfqQueryInput = z.infer<typeof rfqQuerySchema>;

export const assignVendorsSchema = z.object({
  vendorIds: z
    .array(z.string().uuid('Invalid vendor ID'))
    .min(1, 'At least one vendor must be selected')
    .max(20, 'Maximum 20 vendors allowed'),
});

export type AssignVendorsInput = z.infer<typeof assignVendorsSchema>;

export const cancelRfqSchema = z.object({
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(500),
});

export type CancelRfqInput = z.infer<typeof cancelRfqSchema>;

export const reopenRfqSchema = z.object({
  deadline: z.coerce.date({ invalid_type_error: 'Invalid deadline date' }),
}).refine((data) => new Date(data.deadline).getTime() > Date.now(), {
  message: 'New deadline must be in the future',
  path: ['deadline'],
});

export type ReopenRfqInput = z.infer<typeof reopenRfqSchema>;
