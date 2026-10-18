import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const forgotSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

export function ForgotPasswordPage() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotFormData) => {
    try {
      setServerError(null);
      await api.post('/auth/forgot-password', data);
      setSubmittedEmail(data.email);
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-sm sm:max-w-[400px] bg-surface border border-border-default rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border-default flex items-center justify-center mx-auto text-brand">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-primary">Reset Password</h1>
            <p className="text-xs text-secondary mt-0.5">
              Enter your registered email to receive recovery instructions
            </p>
          </div>
        </div>

        {submittedEmail ? (
          <div className="p-5 rounded-xl bg-emerald-950/40 border border-status-success/30 text-center space-y-3 animate-in fade-in">
            <CheckCircle2 className="w-8 h-8 text-status-success mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-primary">Instructions Dispatched</h3>
              <p className="text-xs text-secondary leading-relaxed">
                If an account exists for <strong>{submittedEmail}</strong>, a recovery link valid for 30 minutes has been generated.
              </p>
            </div>
            <Link to="/login" className="block pt-2">
              <Button variant="outline" size="sm" className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-danger/40 text-danger text-xs">
                {serverError}
              </div>
            )}

            <Input
              id="forgot-email"
              label="Email Address"
              type="email"
              placeholder="user@vendorbridge.local"
              required
              error={errors.email?.message}
              {...register('email')}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full font-semibold shadow-md"
              isLoading={isSubmitting}
            >
              Send Reset Link
            </Button>
          </form>
        )}

        <div className="text-center pt-2 border-t border-border-default/60">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
