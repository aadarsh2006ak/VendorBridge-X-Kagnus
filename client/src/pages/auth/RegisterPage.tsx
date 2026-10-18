import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, UserCheck } from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, 'First name must be at least 2 characters').max(50),
    lastName: z.string().trim().min(2, 'Last name must be at least 2 characters').max(50),
    email: z.string().trim().min(1, 'Email is required').email('Invalid email address').toLowerCase(),
    phone: z
      .string()
      .trim()
      .min(10, 'Phone number must have at least 10 digits')
      .max(15, 'Invalid phone number format'),
    role: z.enum(['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR']),
    country: z.string().trim().min(2, 'Country is required').default('India'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
        'Password must contain at least 1 uppercase, 1 lowercase, and 1 number'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    additionalInfo: z.string().trim().max(500).optional(),
    inviteCode: z.string().trim().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      if (data.role === 'ADMIN' && (!data.inviteCode || data.inviteCode.trim() === '')) {
        return false;
      }
      return true;
    },
    {
      message: 'Admin invite code is required to register as Administrator',
      path: ['inviteCode'],
    }
  );

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { success } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'PROCUREMENT_OFFICER',
      country: 'India',
      password: '',
      confirmPassword: '',
      additionalInfo: '',
      inviteCode: '',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setServerError(null);
      await api.post('/auth/register', data);
      success('Account created successfully!', 'Please sign in with your email and password.');
      navigate('/login');
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center p-4 sm:p-6 antialiased select-none">
      <div className="w-full max-w-2xl bg-surface border border-border-default rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center mx-auto text-white font-bold text-xl shadow-lg shadow-brand/20">
            VB
          </div>
          <h1 className="text-xl font-bold tracking-tight text-primary">Create Your Account</h1>
          <p className="text-xs text-secondary">
            Join VendorBridge — Enterprise Procurement & Supplier Ecosystem
          </p>
        </div>

        {/* Server Error Banner */}
        {serverError && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-danger/40 flex items-start gap-2.5 text-danger text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{serverError}</span>
          </div>
        )}

        {/* 2-Column Registration Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Row 1: First Name | Last Name */}
            <Input
              id="reg-first-name"
              label="First Name"
              placeholder="e.g. Rahul"
              required
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              id="reg-last-name"
              label="Last Name"
              placeholder="e.g. Verma"
              required
              error={errors.lastName?.message}
              {...register('lastName')}
            />

            {/* Row 2: Email Address | Phone Number */}
            <Input
              id="reg-email"
              label="Email Address"
              type="email"
              placeholder="user@company.com"
              required
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              id="reg-phone"
              label="Phone Number"
              placeholder="+91 98765 43210"
              required
              error={errors.phone?.message}
              {...register('phone')}
            />

            {/* Row 3: Role | Country */}
            <Select
              id="reg-role"
              label="System Role"
              required
              error={errors.role?.message}
              options={[
                { label: 'Procurement Officer (Buyer)', value: 'PROCUREMENT_OFFICER' },
                { label: 'Vendor (Supplier Partner)', value: 'VENDOR' },
                { label: 'Manager / Approver', value: 'MANAGER' },
                { label: 'System Administrator (Requires Invite Code)', value: 'ADMIN' },
              ]}
              {...register('role')}
            />
            <Input
              id="reg-country"
              label="Country"
              placeholder="India"
              required
              error={errors.country?.message}
              {...register('country')}
            />

            {/* Row 4: Password | Confirm Password */}
            <PasswordInput
              id="reg-password"
              label="Password"
              placeholder="••••••••"
              required
              helperText="Min 8 chars, 1 uppercase, 1 lowercase, 1 number"
              error={errors.password?.message}
              {...register('password')}
            />
            <PasswordInput
              id="reg-confirm-password"
              label="Confirm Password"
              placeholder="••••••••"
              required
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
          </div>

          {/* Conditional Admin Invite Code Field */}
          {selectedRole === 'ADMIN' && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-status-warning/40 space-y-2 animate-in fade-in">
              <span className="text-xs font-semibold text-status-warning block">
                Administrator Privilege Safeguard
              </span>
              <Input
                id="reg-invite-code"
                label="Admin Server Invite Code"
                placeholder="Enter server invite code (e.g. ADMIN_SECRET_INVITE_2026)"
                required
                error={errors.inviteCode?.message}
                {...register('inviteCode')}
              />
            </div>
          )}

          {/* Row 5: Additional Information */}
          <Textarea
            id="reg-additional-info"
            label="Additional Information / Department"
            placeholder="e.g. North Region Procurement Team, Branch #402"
            rows={2}
            error={errors.additionalInfo?.message}
            {...register('additionalInfo')}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full font-semibold shadow-md mt-4"
            isLoading={isSubmitting}
          >
            <UserCheck className="w-4 h-4 mr-1" />
            Complete Registration
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center pt-2 border-t border-border-default/60">
          <p className="text-xs text-secondary">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-brand hover:text-brand-hover font-semibold hover:underline transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
