import React, { SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, id, required, options, ...props }, ref) => {
    const selectId = id || props.name;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-medium text-secondary">
            {label} {required && <span className="text-danger">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? `${selectId}-error` : undefined}
            className={cn(
              'w-full h-10 pl-3.5 pr-10 rounded-lg bg-surface-2 border border-border-default text-primary text-sm appearance-none',
              'transition-colors duration-150 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-danger focus:border-danger focus:ring-danger',
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-surface text-primary">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
        </div>
        {error ? (
          <p id={`${selectId}-error`} className="text-xs text-danger font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-secondary">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
