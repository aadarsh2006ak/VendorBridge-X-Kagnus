import { Router } from 'express';
import { VendorController } from './vendor.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import {
  createVendorSchema,
  updateVendorSchema,
  vendorQuerySchema,
} from './vendor.schemas.js';

export const vendorRouter = Router();

// All vendor routes require authentication
vendorRouter.use(authenticate);

vendorRouter.get(
  '/',
  authorize('vendor:read'),
  validateQuery(vendorQuerySchema),
  VendorController.list
);

vendorRouter.get('/:id', authorize('vendor:read'), VendorController.getById);

vendorRouter.post(
  '/',
  authorize('vendor:create'),
  validateBody(createVendorSchema),
  VendorController.create
);

vendorRouter.patch(
  '/:id',
  authorize('vendor:update'),
  validateBody(updateVendorSchema),
  VendorController.update
);

vendorRouter.delete(
  '/:id',
  authorize('vendor:delete'),
  VendorController.delete
);
