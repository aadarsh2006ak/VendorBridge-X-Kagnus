import React, { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, required, rows = 3, ...props }, ref) => {
    const textareaId = id || props.name;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-medium text-secondary">
            {label} {required && <span className="text-danger">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : undefined}
          className={cn(
            'w-full px-3.5 py-2.5 rounded-lg bg-surface-2 border border-border-default text-primary placeholder:text-muted text-sm',
            'transition-colors duration-150 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-y',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-danger focus:border-danger focus:ring-danger',
            className
          )}
          {...props}
        />
        {error ? (
          <p id={`${textareaId}-error`} className="text-xs text-danger font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-secondary">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
