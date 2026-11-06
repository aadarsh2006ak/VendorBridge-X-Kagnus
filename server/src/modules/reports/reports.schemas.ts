import { z } from 'zod';

export const reportsSummaryQuerySchema = z.object({
  timeRange: z.enum(['30d', '90d', '6m', '1y', 'all']).optional().default('6m'),
});

export const exportReportParamsSchema = z.object({
  type: z.enum(['spend', 'vendors', 'purchase_orders', 'invoices']),
});

export type ReportsSummaryQuery = z.infer<typeof reportsSummaryQuerySchema>;
export type ExportReportParams = z.infer<typeof exportReportParamsSchema>;
