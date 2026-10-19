import { Request, Response, NextFunction } from 'express';
import { ComparisonService } from './comparison.service.js';

export class ComparisonController {
  public static async getComparison(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rfqId = req.params.id as string;
      const { sortBy, order, maxPrice, maxDeliveryDays, minRating, vendorIds } = req.query;

      const matrix = await ComparisonService.getComparisonMatrix(rfqId, {
        sortBy: sortBy as any,
        order: order as any,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        maxDeliveryDays: maxDeliveryDays ? Number(maxDeliveryDays) : undefined,
        minRating: minRating ? Number(minRating) : undefined,
        vendorIds: vendorIds
          ? Array.isArray(vendorIds)
            ? (vendorIds as string[])
            : (vendorIds as string).split(',')
          : undefined,
      });

      res.status(200).json({ data: matrix });
    } catch (error) {
      next(error);
    }
  }

  public static async selectQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rfqId = req.params.id as string;
      const { quotationId, version } = req.body;

      const updated = await ComparisonService.selectQuotation({
        rfqId,
        quotationId,
        version: Number(version),
        userId: req.user!.id,
        ipAddress: req.ip,
      });

      res.status(200).json({ data: updated });
    } catch (error) {
      next(error);
    }
  }

  public static async clearSelection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rfqId = req.params.id as string;
      const { version } = req.body;

      const updated = await ComparisonService.clearSelection({
        rfqId,
        version: Number(version),
        userId: req.user!.id,
        ipAddress: req.ip,
      });

      res.status(200).json({ data: updated });
    } catch (error) {
      next(error);
    }
  }
}
