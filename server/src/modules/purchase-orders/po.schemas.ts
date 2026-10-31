import { z } from 'zod';

export const listPoQuerySchema = z.object({
  status: z.enum(['ALL', 'ISSUED', 'CONFIRMED', 'DELIVERED', 'CANCELLED']).optional().default('ALL'),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export const createPoSchema = z
  .object({
    quotationId: z.string().uuid(),
  })
  .strict();

export type ListPoQuery = z.infer<typeof listPoQuerySchema>;
export type CreatePoInput = z.infer<typeof createPoSchema>;
