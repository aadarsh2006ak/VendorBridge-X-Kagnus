import { z } from 'zod';
import { QuotationStatus } from '@prisma/client';

export const quotationItemInputSchema = z.object({
  rfqItemId: z.string().uuid('Invalid RFQ item ID'),
  unitPrice: z.coerce.number().positive('Unit price must be greater than zero'),
  deliveryDays: z.coerce.number().int().min(0, 'Delivery days cannot be negative'),
});

export type QuotationItemInput = z.infer<typeof quotationItemInputSchema>;

export const upsertQuotationSchema = z.object({
  items: z.array(quotationItemInputSchema).min(1, 'At least one item quotation is required'),
  taxRate: z.coerce
    .number()
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100%')
    .default(18),
  deliveryDays: z.coerce.number().int().min(0).optional(),
  paymentTermsDays: z.coerce.number().int().min(0).max(365).optional(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
  submit: z.boolean().default(false),
  version: z.number().int().positive().optional(),
});

export type UpsertQuotationInput = z.infer<typeof upsertQuotationSchema>;

export const quotationQuerySchema = z.object({
  rfqId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  status: z.nativeEnum(QuotationStatus).optional(),
  sortBy: z.enum(['createdAt', 'grandTotal', 'submittedAt', 'deliveryDays']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type QuotationQueryInput = z.infer<typeof quotationQuerySchema>;
