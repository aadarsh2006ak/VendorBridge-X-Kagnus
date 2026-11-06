import { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reports.service.js';
import { reportsSummaryQuerySchema, exportReportParamsSchema } from './reports.schemas.js';

export class ReportsController {
  public static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const query = reportsSummaryQuerySchema.parse(req.query);
      const summary = await ReportsService.getProcurementSummary(query);
      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  }

  public static async getSpendingTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const months = req.query.months ? parseInt(req.query.months as string, 10) : 6;
      const trends = await ReportsService.getMonthlySpendingTrends(months);
      res.status(200).json(trends);
    } catch (error) {
      next(error);
    }
  }

  public static async getCategoryBreakdown(_req: Request, res: Response, next: NextFunction) {
    try {
      const breakdown = await ReportsService.getCategoryBreakdown();
      res.status(200).json(breakdown);
    } catch (error) {
      next(error);
    }
  }

  public static async getVendorPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const performance = await ReportsService.getVendorPerformance(limit);
      res.status(200).json(performance);
    } catch (error) {
      next(error);
    }
  }

  public static async exportReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { type } = exportReportParamsSchema.parse(req.params);
      const { csv, filename } = await ReportsService.exportReportCsv(type);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }
}
