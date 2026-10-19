import { Router } from 'express';
import { RfqController } from './rfq.controller.js';
import { ComparisonController } from '../comparison/comparison.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import {
  createRfqSchema,
  updateRfqSchema,
  rfqQuerySchema,
  cancelRfqSchema,
  reopenRfqSchema,
} from './rfq.schemas.js';

export const rfqRouter = Router();

rfqRouter.use(authenticate);

rfqRouter.get('/', authorize('rfq:read'), validateQuery(rfqQuerySchema), RfqController.list);
rfqRouter.post('/', authorize('rfq:create'), validateBody(createRfqSchema), RfqController.create);
rfqRouter.get('/:id', authorize('rfq:read'), RfqController.getById);
rfqRouter.put('/:id', authorize('rfq:update'), validateBody(updateRfqSchema), RfqController.update);
rfqRouter.post('/:id/publish', authorize('rfq:publish'), RfqController.publish);
rfqRouter.post('/:id/close', authorize('rfq:close'), RfqController.close);
rfqRouter.post('/:id/cancel', authorize('rfq:cancel'), validateBody(cancelRfqSchema), RfqController.cancel);
rfqRouter.post('/:id/reopen', authorize('rfq:update'), validateBody(reopenRfqSchema), RfqController.reopen);
rfqRouter.delete('/:id', authorize('rfq:delete'), RfqController.delete);

// Quotation Comparison & Selection
rfqRouter.get('/:id/comparison', authorize('quotation:compare'), ComparisonController.getComparison);
rfqRouter.put('/:id/selection', authorize('rfq:select'), ComparisonController.selectQuotation);
rfqRouter.delete('/:id/selection', authorize('rfq:select'), ComparisonController.clearSelection);
