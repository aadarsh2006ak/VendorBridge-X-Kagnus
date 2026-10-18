import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import {
  hashToken,
  generateRandomToken,
  signAccessToken,
} from '../../lib/tokens.js';
import { sendPasswordResetEmail } from '../../lib/mailer.js';
import { AuditService } from '../audit/audit.service.js';
import { env } from '../../config/env.js';
import {
  ConflictError,
  UnauthenticatedError,
  ForbiddenError,
  ValidationError,
} from '../../lib/errors.js';
import {
  RegisterInput,
  LoginInput,
  ResetPasswordInput,
} from './auth.schemas.js';

export interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  role: Role;
  additionalInfo?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function sanitizeUser(user: any): UserResponse {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    country: user.country,
    role: user.role,
    additionalInfo: user.additionalInfo,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class AuthService {
  /**
   * Register a new user account
   */
  public static async register(input: RegisterInput, ip?: string): Promise<UserResponse> {
    // Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new ConflictError('An account with this email address already exists');
    }

    // Admin safeguard (AUTH-9)
    if (input.role === Role.ADMIN) {
      if (!input.inviteCode || input.inviteCode !== env.ADMIN_INVITE_CODE) {
        throw new ForbiddenError('A valid admin invite code is required to register as Administrator');
      }
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        passwordHash,
        phone: input.phone,
        country: input.country,
        role: input.role,
        additionalInfo: input.additionalInfo,
      },
    });

    await AuditService.log({
      actorId: user.id,
      action: 'AUTH_REGISTER',
      entityType: 'User',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
      ip,
    });

    return sanitizeUser(user);
  }

  /**
   * Login user and issue short-lived JWT + rotating refresh token session
   */
  public static async login(
    input: LoginInput,
    ip?: string,
    userAgent?: string
  ): Promise<{ user: UserResponse; accessToken: string; refreshToken: string }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !user.isActive) {
      // Generic auth error (AUTH-2)
      throw new UnauthenticatedError('Invalid email or password');
    }

    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthenticatedError('Invalid email or password');
    }

    // Generate tokens
    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    const refreshToken = generateRandomToken(32);
    const refreshTokenHash = hashToken(refreshToken);

    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        userAgent,
        ip,
        expiresAt,
      },
    });

    await AuditService.log({
      actorId: user.id,
      action: 'AUTH_LOGIN',
      entityType: 'Session',
      metadata: { email: user.email, role: user.role },
      ip,
    });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Rotate refresh token and issue new session (with reuse detection)
   */
  public static async refresh(
    rawRefreshToken: string,
    ip?: string,
    userAgent?: string
  ): Promise<{ user: UserResponse; accessToken: string; refreshToken: string }> {
    if (!rawRefreshToken) {
      throw new UnauthenticatedError('Refresh token is required');
    }

    const tokenHash = hashToken(rawRefreshToken);

    const session = await prisma.session.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    // Reuse detection: If revoked session token is presented, revoke ALL user sessions
    if (session && session.revokedAt !== null) {
      await prisma.session.updateMany({
        where: { userId: session.userId },
        data: { revokedAt: new Date() },
      });

      await AuditService.log({
        actorId: session.userId,
        action: 'AUTH_TOKEN_REUSE_DETECTED',
        entityType: 'Session',
        metadata: { compromisedSessionId: session.id },
        ip,
      });

      throw new UnauthenticatedError('Invalid session. For security, all sessions have been terminated.');
    }

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthenticatedError('Session has expired. Please sign in again.');
    }

    if (!session.user.isActive) {
      throw new UnauthenticatedError('Your account has been deactivated.');
    }

    // Revoke current session
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    // Issue rotated tokens
    const newAccessToken = signAccessToken({
      sub: session.user.id,
      role: session.user.role,
      email: session.user.email,
    });

    const newRefreshToken = generateRandomToken(32);
    const newRefreshTokenHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId: session.user.id,
        refreshTokenHash: newRefreshTokenHash,
        userAgent,
        ip,
        expiresAt,
      },
    });

    return {
      user: sanitizeUser(session.user),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout user and revoke session
   */
  public static async logout(rawRefreshToken?: string, userId?: string, ip?: string): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await prisma.session.updateMany({
        where: { refreshTokenHash: tokenHash },
        data: { revokedAt: new Date() },
      });
    }

    if (userId) {
      await AuditService.log({
        actorId: userId,
        action: 'AUTH_LOGOUT',
        entityType: 'Session',
        ip,
      });
    }
  }

  /**
   * Get current authenticated user profile
   */
  public static async getMe(userId: string): Promise<UserResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthenticatedError('User account not found or deactivated');
    }

    return sanitizeUser(user);
  }

  /**
   * Request password reset token (generic response, no account enumeration)
   */
  public static async forgotPassword(email: string, ip?: string): Promise<{ message: string }> {
    const genericMessage =
      'If an account exists with this email address, password reset instructions have been sent.';

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return { message: genericMessage };
    }

    // Invalidate existing active tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate single-use token valid for 30 minutes
    const resetToken = generateRandomToken(32);
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await AuditService.log({
      actorId: user.id,
      action: 'AUTH_FORGOT_PASSWORD_REQUEST',
      entityType: 'PasswordResetToken',
      ip,
    });

    // Dispatch email
    await sendPasswordResetEmail(user.email, resetToken);

    return { message: genericMessage };
  }

  /**
   * Reset password with single-use token and revoke all active sessions
   */
  public static async resetPassword(
    input: ResetPasswordInput,
    ip?: string
  ): Promise<{ message: string }> {
    const tokenHash = hashToken(input.token);

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.usedAt !== null || resetRecord.expiresAt < new Date()) {
      throw new ValidationError('Password reset link is invalid or has expired.');
    }

    const newPasswordHash = await hashPassword(input.password);

    // Update password
    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash: newPasswordHash },
    });

    // Mark token used
    await prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    });

    // Revoke all existing sessions for this user (AUTH-8)
    await prisma.session.updateMany({
      where: { userId: resetRecord.userId },
      data: { revokedAt: new Date() },
    });

    await AuditService.log({
      actorId: resetRecord.userId,
      action: 'AUTH_PASSWORD_RESET_SUCCESS',
      entityType: 'User',
      entityId: resetRecord.userId,
      ip,
    });

    return {
      message: 'Password reset successful. Please sign in with your new credentials.',
    };
  }
}
