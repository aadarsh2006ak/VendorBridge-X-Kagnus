import React from 'react';
import { cn } from '../../lib/utils';
import { Card } from './Card';

interface StatCardProps {
  value: string | number;
  label: string;
  helperText?: string;
  className?: string;
}

export function StatCard({ value, label, helperText, className }: StatCardProps) {
  return (
    <Card className={cn('p-5 flex flex-col justify-between space-y-3', className)}>
      <div className="space-y-1">
        <div className="text-3xl font-bold tracking-tight text-primary">{value}</div>
        <div className="text-sm font-medium text-secondary">{label}</div>
      </div>
      {helperText && (
        <div className="text-xs text-muted border-t border-border-default/60 pt-2 font-normal">
          {helperText}
        </div>
      )}
    </Card>
  );
}
