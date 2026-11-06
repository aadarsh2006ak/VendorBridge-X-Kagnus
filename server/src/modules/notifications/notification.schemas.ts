import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  page: z.coerce.number().int().positive().optional().default(1),
});

export const markReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).optional(),
  all: z.boolean().optional(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
