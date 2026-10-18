import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Button } from '../../components/ui/Button';
import { getErrorMessage } from '../../lib/api';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const fillCredentials = (email: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'Password@123', { shouldValidate: true });
    setServerError(null);
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      setServerError(null);
      await login(data);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center p-4 sm:p-6 antialiased select-none">
      <div className="w-full max-w-sm sm:max-w-[400px] bg-surface border border-border-default rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Brand & Logo (Replaces Excalidraw 'Photo' placeholder) */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center mx-auto text-white font-bold text-xl shadow-lg shadow-brand/20">
            VB
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-primary">Sign In</h1>
            <p className="text-xs text-secondary mt-0.5">
              Access the VendorBridge ERP Procurement Portal
            </p>
          </div>
        </div>

        {/* Server Error Banner */}
        {serverError && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-danger/40 flex items-start gap-2.5 text-danger text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{serverError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="login-email"
            label="Email Address"
            type="email"
            placeholder="officer@vendorbridge.local"
            required
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="space-y-1">
            <PasswordInput
              id="login-password"
              label="Password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <div className="flex justify-end pt-1">
              <Link
                to="/forgot-password"
                className="text-xs text-brand hover:text-brand-hover hover:underline transition-colors font-medium"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full font-semibold shadow-md mt-2"
            isLoading={isSubmitting}
          >
            <Lock className="w-4 h-4 mr-1" />
            Login
          </Button>
        </form>

        {/* Footer Link */}
        <div className="text-center pt-2 border-t border-border-default/60">
          <p className="text-xs text-secondary">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-brand hover:text-brand-hover font-semibold hover:underline transition-colors"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Quick Demo Credentials Assistant (Dev helper) */}
      <div className="mt-6 p-4 rounded-xl bg-surface/90 border border-border-default max-w-md w-full text-center space-y-2.5 shadow-lg">
        <div className="flex items-center justify-center gap-2 text-xs text-secondary">
          <span className="font-medium text-primary">Demo Password:</span>
          <code className="text-emerald-400 font-mono font-bold bg-surface-2 px-2 py-0.5 rounded border border-border-default select-all text-xs tracking-normal">
            Password@123
          </code>
        </div>
        <p className="text-[11px] text-muted">
          Click any role below to auto-fill credentials:
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
          {[
            { label: 'Admin', email: 'admin@vendorbridge.local' },
            { label: 'Officer', email: 'officer@vendorbridge.local' },
            { label: 'Manager', email: 'manager@vendorbridge.local' },
            { label: 'Vendor', email: 'vendor@vendorbridge.local' },
          ].map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => fillCredentials(acc.email)}
              className="px-2.5 py-1 rounded-md bg-surface-2 hover:bg-surface-2/80 hover:border-brand/60 text-secondary hover:text-primary border border-border-default transition-all cursor-pointer font-mono text-[11px] flex items-center gap-1 active:scale-95"
              title={`Click to auto-fill ${acc.label} credentials`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand inline-block"></span>
              {acc.email}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
