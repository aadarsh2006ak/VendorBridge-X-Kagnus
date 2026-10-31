import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { ApprovalController } from './approval.controller.js';

export const approvalRouter = Router();

approvalRouter.use(authenticate);

// List approvals (Admin, Procurement Officer, Manager)
approvalRouter.get('/', authorize('approval:read'), ApprovalController.listApprovals);

// Get approval by RFQ ID
approvalRouter.get('/by-rfq/:rfqId', authorize('approval:read'), ApprovalController.getApprovalByRfqId);

// Get single approval by ID (Screen 8)
approvalRouter.get('/:id', authorize('approval:read'), ApprovalController.getApprovalById);

// Approve (Manager and Admin only)
approvalRouter.post('/:id/approve', authorize('approval:decide'), ApprovalController.approve);

// Reject (Manager and Admin only)
approvalRouter.post('/:id/reject', authorize('approval:decide'), ApprovalController.reject);
