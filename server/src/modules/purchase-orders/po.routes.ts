import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { PurchaseOrderController } from './po.controller.js';

export const purchaseOrderRouter = Router();

purchaseOrderRouter.use(authenticate);

// List POs (Staff sees all, Vendor sees own)
purchaseOrderRouter.get('/', authorize('po:read'), PurchaseOrderController.listPurchaseOrders);

// Get PO detail (Screen 9)
purchaseOrderRouter.get('/:id', authorize('po:read'), PurchaseOrderController.getPurchaseOrderById);

// Generate PO from approved quotation (Staff only)
purchaseOrderRouter.post('/generate', authorize('po:create'), PurchaseOrderController.createFromQuotation);
