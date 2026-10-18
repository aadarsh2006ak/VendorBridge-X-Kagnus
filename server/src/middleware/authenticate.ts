import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ACCESS_COOKIE_NAME } from '../lib/cookies.js';
import { verifyAccessToken } from '../lib/tokens.js';
import { UnauthenticatedError } from '../lib/errors.js';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  // Check cookie first, fallback to Authorization Bearer header
  let token = req.cookies?.[ACCESS_COOKIE_NAME];

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new UnauthenticatedError('Authentication required', 'UNAUTHENTICATED');
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthenticatedError('Access token has expired', 'TOKEN_EXPIRED');
    }
    throw new UnauthenticatedError('Invalid authentication token', 'UNAUTHENTICATED');
  }
}
