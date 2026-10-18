import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('4000'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.string().transform((val) => parseInt(val, 10)).default('7'),
  COOKIE_SECURE: z.string().transform((val) => val === 'true').default('false'),
  ADMIN_INVITE_CODE: z.string().min(1, 'ADMIN_INVITE_CODE is required'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('VendorBridge <no-reply@vendorbridge.local>'),
  PASSWORD_RESET_URL_BASE: z.string().default('http://localhost:5173/reset-password'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables configuration:');
  console.error(_env.error.format());
  process.exit(1);
}

export const env = _env.data;
