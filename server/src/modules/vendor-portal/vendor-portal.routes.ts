import { Router } from 'express';
import { VendorPortalController } from './vendor-portal.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';
import { upsertQuotationSchema } from '../quotations/quotation.schemas.js';

export const vendorPortalRouter = Router();

vendorPortalRouter.use(authenticate);
vendorPortalRouter.use(authorize('vendorPortal:use'));

vendorPortalRouter.get('/rfqs', VendorPortalController.listAssignedRfqs);
vendorPortalRouter.get('/rfqs/:rfqId', VendorPortalController.getAssignedRfqById);
vendorPortalRouter.put(
  '/rfqs/:rfqId/quotation',
  validateBody(upsertQuotationSchema),
  VendorPortalController.submitQuotation
);
