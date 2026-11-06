import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { AuditController } from './audit.controller.js';

export const auditRouter = Router();

auditRouter.use(authenticate);

// List timeline audit logs (Staff only: ADMIN, PROCUREMENT_OFFICER, MANAGER)
auditRouter.get('/', authorize('audit:read'), AuditController.listAuditLogs);

// Get activity summary stats
auditRouter.get('/stats', authorize('audit:read'), AuditController.getAuditStats);
