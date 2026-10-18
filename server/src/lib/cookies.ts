import { Response, CookieOptions } from 'express';
import { env } from '../config/env.js';

export const ACCESS_COOKIE_NAME = 'vb_access_token';
export const REFRESH_COOKIE_NAME = 'vb_refresh_token';

export function getAccessCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60 * 1000, // 15 minutes
  };
}

export function getRefreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000, // 7 days
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, getAccessCookieOptions());
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
  });
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
  });
}
