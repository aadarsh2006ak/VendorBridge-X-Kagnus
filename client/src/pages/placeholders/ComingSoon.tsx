import React from 'react';
import { LucideIcon, ArrowLeft, Clock, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

interface ComingSoonProps {
  moduleName: string;
  targetWeek: string;
  description: string;
  icon: LucideIcon;
  features: string[];
}

export function ComingSoon({
  moduleName,
  targetWeek,
  description,
  icon: Icon,
  features,
}: ComingSoonProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-primary">{moduleName}</h1>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-subtle text-status-success border border-brand/40">
            <Clock className="w-3 h-3" />
            {targetWeek}
          </span>
        </div>
        <p className="text-sm text-secondary">{description}</p>
      </div>

      {/* Placeholder Overview Card */}
      <Card className="p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border-default flex items-center justify-center mx-auto text-brand shadow-inner">
          <Icon className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-primary">
            {moduleName} Module Scheduled
          </h2>
          <p className="text-sm text-secondary max-w-md mx-auto leading-relaxed">
            Per the ERP roadmap, this workflow is designated for <strong>{targetWeek}</strong>. In Week 1, the core authentication and persistent vendor registry are active.
          </p>
        </div>

        {/* Planned Capabilities */}
        <div className="bg-surface-2/60 border border-border-default/70 rounded-xl p-5 text-left space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-brand" />
            Planned {targetWeek} Deliverables:
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-secondary">
            {features.map((feat, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-2">
          <Link to="/dashboard">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default ComingSoon;
