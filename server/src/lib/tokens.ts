import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { RoleType } from '../config/permissions.js';

export interface AccessTokenPayload {
  sub: string;
  role: RoleType;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Hash a plain token with SHA-256 before persisting in the database.
 * Storing plaintext tokens in DB is strictly prohibited by security rules.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate cryptographically secure random token (hex string).
 */
export function generateRandomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Sign a short-lived access JWT (15 minutes).
 */
export function signAccessToken(payload: { sub: string; role: RoleType; email: string }): string {
  return jwt.sign(
    {
      sub: payload.sub,
      role: payload.role,
      email: payload.email,
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
    }
  );
}

/**
 * Verify and decode an access JWT.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}
