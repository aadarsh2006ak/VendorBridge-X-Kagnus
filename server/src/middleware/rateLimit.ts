import rateLimit from 'express-rate-limit';
import { RateLimitedError } from '../lib/errors.js';
import { env } from '../config/env.js';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 1000 : 10, // 10 attempts per 15 min in dev/prod
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new RateLimitedError('Too many authentication attempts. Please try again after 15 minutes.'));
  },
});
