import React, { InputHTMLAttributes, forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, error, helperText, id, required, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || props.name;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-secondary">
            {label} {required && <span className="text-danger">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={cn(
              'w-full h-10 pl-3.5 pr-10 rounded-lg bg-surface-2 border border-border-default text-primary placeholder:text-muted text-sm',
              'transition-colors duration-150 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-danger focus:border-danger focus:ring-danger',
              className
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary focus:outline-none transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-danger font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-secondary">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
