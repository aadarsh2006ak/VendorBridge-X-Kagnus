import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service.js';
import { listNotificationsQuerySchema, markReadSchema } from './notification.schemas.js';

export class NotificationController {
  public static async listNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listNotificationsQuerySchema.parse(req.query);
      const result = await NotificationService.listUserNotifications(req.user!.id, query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public static async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await NotificationService.getUnreadCount(req.user!.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const updated = await NotificationService.markAsRead(id, req.user!.id);
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await NotificationService.markAllAsRead(req.user!.id);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}
