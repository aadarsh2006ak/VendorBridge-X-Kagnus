import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validateBody } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authRateLimiter } from '../../middleware/rateLimit.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schemas.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  authRateLimiter,
  validateBody(registerSchema),
  AuthController.register
);

authRouter.post(
  '/login',
  authRateLimiter,
  validateBody(loginSchema),
  AuthController.login
);

authRouter.post('/refresh', AuthController.refresh);

authRouter.post('/logout', authenticate, AuthController.logout);

authRouter.get('/me', authenticate, AuthController.getMe);

authRouter.post(
  '/forgot-password',
  authRateLimiter,
  validateBody(forgotPasswordSchema),
  AuthController.forgotPassword
);

authRouter.post(
  '/reset-password',
  validateBody(resetPasswordSchema),
  AuthController.resetPassword
);
