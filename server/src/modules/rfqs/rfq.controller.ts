import { Request, Response, NextFunction } from 'express';
import { RfqService } from './rfq.service.js';

export class RfqController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rfq = await RfqService.createRfq(req.body, req.user!.id, req.ip);
      res.status(201).json({ data: rfq });
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await RfqService.listRfqs(req.query as any);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rfq = await RfqService.getRfqById(req.params.id as string);
      res.status(200).json({ data: rfq });
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rfq = await RfqService.updateRfq(
        req.params.id as string,
        req.body,
        req.user!.id,
        req.user!.role,
        req.ip
      );
      res.status(200).json({ data: rfq });
    } catch (error) {
      next(error);
    }
  }

  public static async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rfq = await RfqService.publishRfq(
        req.params.id as string,
        req.user!.id,
        req.user!.role,
        req.ip
      );
      res.status(200).json({ data: rfq });
    } catch (error) {
      next(error);
    }
  }

  public static async close(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rfq = await RfqService.closeRfq(
        req.params.id as string,
        req.user!.id,
        req.user!.role,
        req.ip
      );
      res.status(200).json({ data: rfq });
    } catch (error) {
      next(error);
    }
  }

  public static async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rfq = await RfqService.cancelRfq(
        req.params.id as string,
        req.body,
        req.user!.id,
        req.user!.role,
        req.ip
      );
      res.status(200).json({ data: rfq });
    } catch (error) {
      next(error);
    }
  }

  public static async reopen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rfq = await RfqService.reopenRfq(
        req.params.id as string,
        req.body,
        req.user!.id,
        req.user!.role,
        req.ip
      );
      res.status(200).json({ data: rfq });
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await RfqService.deleteRfq(
        req.params.id as string,
        req.user!.id,
        req.user!.role,
        req.ip
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
