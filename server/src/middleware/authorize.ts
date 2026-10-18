import { Request, Response, NextFunction } from 'express';
import { PermissionKey, PERMISSIONS } from '../config/permissions.js';
import { ForbiddenError, UnauthenticatedError } from '../lib/errors.js';

export function authorize(permission: PermissionKey) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthenticatedError('Authentication required');
    }

    const allowedRoles = PERMISSIONS[permission] as readonly string[];
    if (!allowedRoles || !allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access denied. Role '${req.user.role}' is not authorized to perform action '${permission}'.`
      );
    }

    next();
  };
}
