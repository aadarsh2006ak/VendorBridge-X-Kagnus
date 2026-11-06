import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { ReportsController } from './reports.controller.js';

export const reportsRouter = Router();

reportsRouter.use(authenticate);

// Staff access only (Admin, Manager, Procurement Officer)
reportsRouter.get('/summary', authorize('reports:read'), ReportsController.getSummary);
reportsRouter.get('/spending-trends', authorize('reports:read'), ReportsController.getSpendingTrends);
reportsRouter.get('/category-breakdown', authorize('reports:read'), ReportsController.getCategoryBreakdown);
reportsRouter.get('/vendor-performance', authorize('reports:read'), ReportsController.getVendorPerformance);
reportsRouter.get('/export/:type', authorize('reports:export'), ReportsController.exportReport);
