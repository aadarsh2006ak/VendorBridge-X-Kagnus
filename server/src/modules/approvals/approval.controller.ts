import { Request, Response, NextFunction } from 'express';
import { ApprovalService } from './approval.service.js';
import {
  decideApprovalSchema,
  rejectApprovalSchema,
  listApprovalsQuerySchema,
} from './approval.schemas.js';

export class ApprovalController {
  public static async listApprovals(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listApprovalsQuerySchema.parse(req.query);
      const result = await ApprovalService.listApprovals(query, req.user!);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public static async getApprovalById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const approval = await ApprovalService.getApprovalById(id);
      res.status(200).json(approval);
    } catch (error) {
      next(error);
    }
  }

  public static async getApprovalByRfqId(req: Request, res: Response, next: NextFunction) {
    try {
      const { rfqId } = req.params;
      const approval = await ApprovalService.getApprovalByRfqId(rfqId);
      res.status(200).json(approval);
    } catch (error) {
      next(error);
    }
  }

  public static async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const input = decideApprovalSchema.parse(req.body);
      const result = await ApprovalService.approve(
        id,
        input,
        req.user! as any,
        req.ip
      );
      res.status(200).json({
        message: 'Approval request approved successfully. Purchase Order generated.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const input = rejectApprovalSchema.parse(req.body);
      const result = await ApprovalService.reject(
        id,
        input,
        req.user! as any,
        req.ip
      );
      res.status(200).json({
        message: 'Approval request rejected.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
