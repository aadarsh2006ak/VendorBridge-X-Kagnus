import { Request, Response, NextFunction } from 'express';
import { PurchaseOrderService } from './po.service.js';
import { listPoQuerySchema, createPoSchema } from './po.schemas.js';

export class PurchaseOrderController {
  public static async listPurchaseOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listPoQuerySchema.parse(req.query);
      const result = await PurchaseOrderService.listPurchaseOrders(query, req.user!);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public static async getPurchaseOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const po = await PurchaseOrderService.getPurchaseOrderById(id, req.user!);
      res.status(200).json(po);
    } catch (error) {
      next(error);
    }
  }

  public static async createFromQuotation(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createPoSchema.parse(req.body);
      const po = await PurchaseOrderService.createFromQuotation(input, req.user!, req.ip);
      res.status(201).json({
        message: 'Purchase Order generated successfully.',
        data: po,
      });
    } catch (error) {
      next(error);
    }
  }
}
