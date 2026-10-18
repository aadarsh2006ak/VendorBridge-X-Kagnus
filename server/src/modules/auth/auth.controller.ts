import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import {
  setAuthCookies,
  clearAuthCookies,
  REFRESH_COOKIE_NAME,
} from '../../lib/cookies.js';

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.register(req.body, req.ip);
      res.status(201).json({ user });
    } catch (error) {
      next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, accessToken, refreshToken } = await AuthService.login(
        req.body,
        req.ip,
        req.headers['user-agent']
      );

      setAuthCookies(res, accessToken, refreshToken);
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
      const { user, accessToken, refreshToken } = await AuthService.refresh(
        rawRefreshToken,
        req.ip,
        req.headers['user-agent']
      );

      setAuthCookies(res, accessToken, refreshToken);
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
      await AuthService.logout(rawRefreshToken, req.user?.id, req.ip);

      clearAuthCookies(res);
      res.status(200).json({ message: 'Successfully logged out' });
    } catch (error) {
      next(error);
    }
  }

  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getMe(req.user!.id);
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }

  public static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.forgotPassword(req.body.email, req.ip);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.resetPassword(req.body, req.ip);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
