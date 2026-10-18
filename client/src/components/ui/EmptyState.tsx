import React from 'react';
import { LucideIcon, PackageOpen } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 rounded-xl border border-dashed border-border-default/80 bg-surface/50 space-y-3',
        className
      )}
    >
      <div className="p-3 rounded-full bg-surface-2 border border-border-default text-muted">
        <Icon className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-base font-medium text-primary">{title}</h3>
        <p className="text-xs text-secondary leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
