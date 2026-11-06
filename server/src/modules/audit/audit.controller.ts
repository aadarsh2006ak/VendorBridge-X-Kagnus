import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service.js';
import { listAuditLogsQuerySchema } from './audit.schemas.js';

export class AuditController {
  public static async listAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listAuditLogsQuerySchema.parse(req.query);
      const result = await AuditService.listAuditLogs(query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public static async getAuditStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AuditService.getAuditStats();
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  }
}
