import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  ShoppingBag,
  AlertCircle,
  Plus,
  Receipt,
  Building2,
  TrendingUp,
  PackageOpen,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/utils';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface DashboardSummary {
  activeRfqs: number;
  pendingApprovals: number;
  posThisMonth: { count: number; amount: number };
  overdueInvoices: number;
  recentPurchaseOrders: Array<{
    id: string;
    poNumber: string;
    vendorName: string;
    amount: number;
    status: string;
    date: string;
  }>;
  spendingTrend: Array<{ month: string; amount: number }>;
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary');
      return res.data;
    },
  });

  const getRoleDisplayName = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator';
      case 'PROCUREMENT_OFFICER':
        return 'Procurement Officer';
      case 'MANAGER':
        return 'Manager / Approver';
      case 'VENDOR':
        return 'Vendor Partner';
      default:
        return 'User';
    }
  };

  const canCreateVendor = user?.role === 'ADMIN' || user?.role === 'PROCUREMENT_OFFICER';

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Header & Greeting (DASH-1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-default/60">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
            Dashboard
          </h1>
          <p className="text-sm text-secondary">
            Welcome back,{' '}
            <span className="font-semibold text-brand-hover">
              {getRoleDisplayName(user?.role)}
            </span>{' '}
            — Today's Overview
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-2 border border-border-default text-secondary">
            <Calendar className="w-3.5 h-3.5 text-brand" />
            {new Date().toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* 2. Four Summary KPI Cards (DASH-2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          value={isLoading ? '-' : summary?.activeRfqs ?? 0}
          label="Active RFQ's"
          helperText="RFQs arrive in Week 2"
        />
        <StatCard
          value={isLoading ? '-' : summary?.pendingApprovals ?? 0}
          label="Pending Approvals"
          helperText="Approvals arrive in Week 3"
        />
        <StatCard
          value={isLoading ? '-' : formatINR(summary?.posThisMonth?.amount ?? 0)}
          label="PO's this month"
          helperText="Purchase orders arrive in Week 4"
        />
        <StatCard
          value={isLoading ? '-' : summary?.overdueInvoices ?? 0}
          label="Overdue Invoices"
          helperText="Invoices arrive in Week 4"
        />
      </div>

      {/* 3. Two Content Panels (DASH-3 & DASH-4) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Recent Purchase Orders (Span 2) */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <CardHeader className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-base font-semibold text-primary">Recent Purchase Orders</h2>
              <p className="text-xs text-secondary">Latest procurement commitments and orders</p>
            </div>
            <span className="text-xs font-medium text-muted px-2 py-0.5 rounded bg-surface-2 border border-border-default">
              Week 4 Feature
            </span>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="text-center space-y-3 py-6 max-w-sm">
              <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border-default flex items-center justify-center mx-auto text-muted">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-primary">No purchase orders yet</h3>
                <p className="text-xs text-secondary leading-relaxed">
                  Purchase orders will be automatically generated upon manager approval in Week 4.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel: Spending Trends (Span 1) */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-base font-semibold text-primary">Spending Trends</h2>
              <p className="text-xs text-secondary">Last 6 months expenditure</p>
            </div>
            <TrendingUp className="w-4 h-4 text-brand" />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="text-center space-y-3 py-6 max-w-xs">
              <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border-default flex items-center justify-center mx-auto text-muted">
                <PackageOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-primary">No spending data yet</h3>
                <p className="text-xs text-secondary leading-relaxed">
                  Financial trends and monthly spend analytics will populate once orders are active.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Quick Actions (DASH-5) */}
      <div className="pt-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
          Quick Actions
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          {/* Action 1: + New RFQ (Disabled with tooltip) */}
          <div className="relative group">
            <Button
              variant="outline"
              size="md"
              disabled
              className="gap-2 cursor-not-allowed opacity-60"
            >
              <Plus className="w-4 h-4" />
              + New RFQ
            </Button>
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-surface-2 text-primary text-[11px] font-medium px-2.5 py-1 rounded shadow-lg border border-border-default whitespace-nowrap z-20 pointer-events-none">
              Coming in Week 2
            </div>
          </div>

          {/* Action 2: Add Vendor (Functional & Role-Aware) */}
          {canCreateVendor && (
            <Button
              variant="primary"
              size="md"
              className="gap-2 shadow-md"
              onClick={() => navigate('/vendors?action=new')}
            >
              <Building2 className="w-4 h-4" />
              Add Vendor
            </Button>
          )}

          {/* Action 3: View Invoices (Navigates to Invoices page) */}
          <Link to="/invoices">
            <Button variant="outline" size="md" className="gap-2">
              <Receipt className="w-4 h-4" />
              View Invoices
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
