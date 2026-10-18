import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, id, required, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-secondary"
          >
            {label} {required && <span className="text-danger">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          type={type}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            'w-full h-10 px-3.5 rounded-lg bg-surface-2 border border-border-default text-primary placeholder:text-muted text-sm',
            'transition-colors duration-150 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-danger focus:border-danger focus:ring-danger',
            className
          )}
          {...props}
        />
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

Input.displayName = 'Input';
