import { Request, Response, NextFunction } from 'express';
import { VendorPortalService } from './vendor-portal.service.js';

export class VendorPortalController {
  public static async listAssignedRfqs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rfqs = await VendorPortalService.listAssignedRfqs(req.user!.id);
      res.status(200).json({ data: rfqs });
    } catch (error) {
      next(error);
    }
  }

  public static async getAssignedRfqById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rfq = await VendorPortalService.getAssignedRfqById(req.user!.id, req.params.rfqId as string);
      res.status(200).json({ data: rfq });
    } catch (error) {
      next(error);
    }
  }

  public static async submitQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quotation = await VendorPortalService.submitQuotation({
        userId: req.user!.id,
        rfqId: req.params.rfqId as string,
        input: req.body,
        ipAddress: req.ip,
      });
      res.status(200).json({ data: quotation });
    } catch (error) {
      next(error);
    }
  }
}
