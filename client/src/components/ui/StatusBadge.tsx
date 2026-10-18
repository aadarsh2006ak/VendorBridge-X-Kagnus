import React from 'react';
import { cn } from '../../lib/utils';

export type VendorStatusType = 'ACTIVE' | 'PENDING' | 'BLOCKED';

interface StatusBadgeProps {
  status: VendorStatusType | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toUpperCase() as VendorStatusType;

  const styles = {
    ACTIVE: {
      bg: 'bg-emerald-950/50 text-status-success border-status-success/30',
      dot: 'bg-status-success',
      label: 'Active',
    },
    PENDING: {
      bg: 'bg-amber-950/50 text-status-warning border-status-warning/30',
      dot: 'bg-status-warning',
      label: 'Pending',
    },
    BLOCKED: {
      bg: 'bg-red-950/50 text-status-danger border-status-danger/30',
      dot: 'bg-status-danger',
      label: 'Blocked',
    },
  };

  const current = styles[normalized] || {
    bg: 'bg-surface-2 text-secondary border-border-default',
    dot: 'bg-muted',
    label: status,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border select-none',
        current.bg,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', current.dot)} aria-hidden="true" />
      {current.label}
    </span>
  );
}
