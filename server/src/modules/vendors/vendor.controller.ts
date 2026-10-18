import { Request, Response, NextFunction } from 'express';
import { VendorService } from './vendor.service.js';

export class VendorController {
  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await VendorService.listVendors(req.query as any);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vendor = await VendorService.getVendorById(req.params.id);
      res.status(200).json({ data: vendor });
    } catch (error) {
      next(error);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vendor = await VendorService.createVendor(req.body, req.user!.id, req.ip);
      res.status(201).json({ data: vendor });
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vendor = await VendorService.updateVendor(
        req.params.id,
        req.body,
        req.user!.id,
        req.ip
      );
      res.status(200).json({ data: vendor });
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await VendorService.deleteVendor(req.params.id, req.user!.id, req.ip);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
