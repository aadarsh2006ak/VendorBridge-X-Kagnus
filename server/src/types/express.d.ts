import { RoleType } from '../config/permissions.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: RoleType;
        email: string;
      };
    }
  }
}

export {};
