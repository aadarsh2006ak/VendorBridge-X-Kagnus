import { z } from 'zod';

export const listInvoicesQuerySchema = z.object({
  status: z.enum(['ALL', 'PENDING_PAYMENT', 'PAID', 'CANCELLED']).optional().default('ALL'),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export const createInvoiceSchema = z
  .object({
    purchaseOrderId: z.string().uuid(),
  })
  .strict();

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(['PAID', 'PENDING_PAYMENT', 'CANCELLED']),
  paymentReference: z.string().optional(),
  paymentDate: z.string().optional(),
  notes: z.string().optional(),
});

export const emailInvoiceSchema = z.object({
  recipientEmail: z.string().email().optional(),
  notes: z.string().max(500).optional(),
  message: z.string().max(500).optional(),
});

export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>;
export type EmailInvoiceInput = z.infer<typeof emailInvoiceSchema>;
