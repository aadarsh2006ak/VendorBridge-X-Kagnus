import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../lib/errors.js';

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  if (MUTATING_METHODS.includes(req.method)) {
    const customHeader = req.headers['x-requested-with'];
    if (customHeader !== 'VendorBridge') {
      throw new ForbiddenError('Missing or invalid X-Requested-With header');
    }
  }
  next();
}
