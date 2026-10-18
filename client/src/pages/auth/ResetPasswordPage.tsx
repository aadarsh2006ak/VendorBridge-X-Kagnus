import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Button } from '../../components/ui/Button';

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
        'Password must contain at least 1 uppercase, 1 lowercase, and 1 number'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetFormData = z.infer<typeof resetSchema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-sm bg-surface border border-border-default rounded-2xl p-6 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-status-warning mx-auto" />
          <h2 className="text-lg font-semibold text-primary">Missing Reset Token</h2>
          <p className="text-xs text-secondary">
            This password recovery link is missing its authentication token or has expired.
          </p>
          <Link to="/forgot-password">
            <Button variant="primary" size="sm" className="w-full">
              Request New Reset Link
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: ResetFormData) => {
    try {
      setServerError(null);
      await api.post('/auth/reset-password', {
        token,
        password: data.password,
      });
      setIsSuccess(true);
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-sm sm:max-w-[400px] bg-surface border border-border-default rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border-default flex items-center justify-center mx-auto text-brand">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-primary">Set New Password</h1>
            <p className="text-xs text-secondary mt-0.5">
              Choose a strong password with at least 8 characters
            </p>
          </div>
        </div>

        {isSuccess ? (
          <div className="p-5 rounded-xl bg-emerald-950/40 border border-status-success/30 text-center space-y-3 animate-in fade-in">
            <CheckCircle2 className="w-8 h-8 text-status-success mx-auto" />
            <h3 className="text-sm font-semibold text-primary">Password Updated!</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Your password has been securely updated and all active sessions have been reset.
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                Sign In Now
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-danger/40 text-danger text-xs font-medium">
                {serverError}
              </div>
            )}

            <PasswordInput
              id="reset-password"
              label="New Password"
              placeholder="••••••••"
              required
              helperText="Min 8 chars, 1 uppercase, 1 lowercase, 1 number"
              error={errors.password?.message}
              {...register('password')}
            />

            <PasswordInput
              id="reset-confirm-password"
              label="Confirm New Password"
              placeholder="••••••••"
              required
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full font-semibold shadow-md mt-2"
              isLoading={isSubmitting}
            >
              Update Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;
