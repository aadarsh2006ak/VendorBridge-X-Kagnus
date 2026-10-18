import { z } from 'zod';
import { Role } from '@prisma/client';

export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
export const phoneRegex = /^[+]?[\d\s-]{10,15}$/;

export const registerSchema = z
  .object({
    firstName: z
      .string({ required_error: 'First name is required' })
      .trim()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name cannot exceed 50 characters'),
    lastName: z
      .string({ required_error: 'Last name is required' })
      .trim()
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name cannot exceed 50 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Invalid email address')
      .toLowerCase(),
    phone: z
      .string({ required_error: 'Phone number is required' })
      .trim()
      .regex(phoneRegex, 'Invalid phone number (minimum 10 digits)'),
    role: z.nativeEnum(Role, {
      errorMap: () => ({
        message: 'Invalid role. Choose from ADMIN, PROCUREMENT_OFFICER, MANAGER, VENDOR',
      }),
    }),
    country: z.string().trim().min(2, 'Country must be at least 2 characters').default('India'),
    additionalInfo: z.string().trim().max(500).optional().nullable(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .regex(
        passwordRegex,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string().optional(),
    inviteCode: z.string().trim().optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Invalid email address')
      .toLowerCase(),
    password: z.string({ required_error: 'Password is required' }).min(1, 'Password cannot be empty'),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Invalid email address')
      .toLowerCase(),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string({ required_error: 'Reset token is required' }).min(1, 'Token is required'),
    password: z
      .string({ required_error: 'New password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .regex(
        passwordRegex,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
