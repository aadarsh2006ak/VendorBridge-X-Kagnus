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
  CheckSquare,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/utils';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';

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
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const recentPOs = summary?.recentPurchaseOrders || [];

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
            — Procurement Operations Overview
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
        <div className="cursor-pointer" onClick={() => navigate('/rfqs')}>
          <StatCard
            value={isLoading ? '-' : summary?.activeRfqs ?? 0}
            label="Active RFQ's"
            helperText="Open procurement requests"
          />
        </div>
        <div
          className="cursor-pointer"
          onClick={() => navigate(isManagerOrAdmin ? '/approvals' : '/rfqs')}
        >
          <StatCard
            value={isLoading ? '-' : summary?.pendingApprovals ?? 0}
            label="Pending Approvals"
            helperText="Awaiting manager decision"
          />
        </div>
        <div className="cursor-pointer" onClick={() => navigate('/purchase-orders')}>
          <StatCard
            value={isLoading ? '-' : formatINR(summary?.posThisMonth?.amount ?? 0)}
            label="PO's this month"
            helperText={`${summary?.posThisMonth?.count ?? 0} orders issued`}
          />
        </div>
        <div className="cursor-pointer" onClick={() => navigate('/invoices')}>
          <StatCard
            value={isLoading ? '-' : summary?.overdueInvoices ?? 0}
            label="Pending Invoices"
            helperText="Awaiting payment settlement"
          />
        </div>
      </div>

      {/* 3. Two Content Panels (DASH-3 & DASH-4) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Recent Purchase Orders (Span 2) */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <CardHeader className="flex items-center justify-between pb-3">
            <div className="space-y-0.5">
              <h2 className="text-base font-semibold text-primary">Recent Purchase Orders</h2>
              <p className="text-xs text-secondary">Official procurement commitments</p>
            </div>
            <Link
              to="/purchase-orders"
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {recentPOs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/30 border-b border-border text-secondary font-medium uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">PO Number</th>
                      <th className="py-2.5 px-4">Vendor</th>
                      <th className="py-2.5 px-4">Amount</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentPOs.map((po) => (
                      <tr
                        key={po.id}
                        className="hover:bg-muted/15 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/purchase-orders/${po.id}`)}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-primary group-hover:text-brand-400 transition-colors">
                          {po.poNumber}
                        </td>
                        <td className="py-3 px-4 text-primary font-medium">{po.vendorName}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-emerald-400">
                          {formatINR(po.amount)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={po.status} />
                        </td>
                        <td className="py-3 px-4 text-secondary">
                          {new Date(po.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border-default flex items-center justify-center text-muted">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-primary">No purchase orders yet</h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    Purchase orders will appear here automatically when quotations are approved.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel: Spending Trends (Span 1) */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex items-center justify-between pb-3">
            <div className="space-y-0.5">
              <h2 className="text-base font-semibold text-primary">Spending Overview</h2>
              <p className="text-xs text-secondary">Procurement budget distribution</p>
            </div>
            <TrendingUp className="w-4 h-4 text-brand-400" />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between p-5 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary">Monthly PO Volume:</span>
                <span className="font-mono font-bold text-primary">
                  {formatINR(summary?.posThisMonth?.amount ?? 0)}
                </span>
              </div>
              <div className="w-full bg-surface-2 h-2 rounded-full overflow-hidden">
                <div className="bg-brand-500 h-full rounded-full w-2/3"></div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-secondary">Audit Trail:</span>
                <span className="text-emerald-400 font-medium">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary">Tax Engine (GST):</span>
                <span className="text-primary font-mono">18% (9+9)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary">Compliance:</span>
                <span className="text-brand-400 font-medium">Standard ERP</span>
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
          {/* Action 1: + New RFQ */}
          <Button
            variant="outline"
            size="md"
            className="gap-2"
            onClick={() => navigate('/rfqs/new')}
          >
            <Plus className="w-4 h-4" />
            + New RFQ
          </Button>

          {/* Action 2: Review Approvals */}
          {isManagerOrAdmin && (
            <Button
              variant="outline"
              size="md"
              className="gap-2 border-brand-500/40 text-brand-400 hover:bg-brand-500/10"
              onClick={() => navigate('/approvals')}
            >
              <CheckSquare className="w-4 h-4" />
              Review Approvals ({summary?.pendingApprovals ?? 0})
            </Button>
          )}

          {/* Action 3: Add Vendor */}
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

          {/* Action 4: View Invoices */}
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
