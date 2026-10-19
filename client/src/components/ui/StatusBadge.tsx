import React from 'react';
import { cn } from '../../lib/utils';

export type StatusType =
  | 'ACTIVE'
  | 'PENDING'
  | 'BLOCKED'
  | 'DRAFT'
  | 'OPEN'
  | 'CLOSED'
  | 'QUOTATION_SELECTED'
  | 'CANCELLED'
  | 'SUBMITTED'
  | string;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, className, size = 'sm' }: StatusBadgeProps) {
  const normalized = (status || '').toUpperCase();

  const styles: Record<string, { bg: string; dot: string; label: string }> = {
    // Vendor Statuses
    ACTIVE: {
      bg: 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-400',
      label: 'Active',
    },
    PENDING: {
      bg: 'bg-amber-950/50 text-amber-400 border-amber-500/30',
      dot: 'bg-amber-400',
      label: 'Pending',
    },
    BLOCKED: {
      bg: 'bg-red-950/50 text-rose-400 border-rose-500/30',
      dot: 'bg-rose-400',
      label: 'Blocked',
    },

    // RFQ Statuses
    DRAFT: {
      bg: 'bg-slate-900/60 text-slate-300 border-slate-700/50',
      dot: 'bg-slate-400',
      label: 'Draft',
    },
    OPEN: {
      bg: 'bg-blue-950/50 text-blue-400 border-blue-500/30',
      dot: 'bg-blue-400 animate-pulse',
      label: 'Open',
    },
    CLOSED: {
      bg: 'bg-amber-950/50 text-amber-400 border-amber-500/30',
      dot: 'bg-amber-400',
      label: 'Closed',
    },
    QUOTATION_SELECTED: {
      bg: 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30',
      dot: 'bg-emerald-400',
      label: 'Quotation Selected',
    },
    CANCELLED: {
      bg: 'bg-rose-950/50 text-rose-400 border-rose-500/30',
      dot: 'bg-rose-400',
      label: 'Cancelled',
    },

    // Quotation Statuses
    SUBMITTED: {
      bg: 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30',
      dot: 'bg-emerald-400',
      label: 'Submitted',
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
        'inline-flex items-center gap-1.5 rounded-full font-medium border select-none',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        current.bg,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', current.dot)} aria-hidden="true" />
      {current.label}
    </span>
  );
}
