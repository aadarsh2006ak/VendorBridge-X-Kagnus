import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Receipt,
  Building2,
  FileSpreadsheet,
  Award,
  ArrowUpRight,
  RefreshCw,
  Star,
  CheckCircle2,
  PieChart,
} from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { formatINR, cn } from '../../lib/utils';

interface ReportsSummary {
  totalProcurementSpend: number;
  totalPOs: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  activeRfqsCount: number;
  totalQuotationsCount: number;
  totalVendorsCount: number;
  averageOrderValue: number;
}

interface SpendingTrendItem {
  month: string;
  label: string;
  poSpend: number;
  invoicePaid: number;
  poCount: number;
}

interface CategoryBreakdownItem {
  category: string;
  totalSpend: number;
  poCount: number;
  percentage: number;
}

interface VendorPerformanceItem {
  id: string;
  name: string;
  category: string;
  gstin: string;
  status: string;
  rating: number;
  totalPOs: number;
  totalSpend: number;
  quotationsSubmitted: number;
  winRate: number;
}

export function ReportsPage() {
  const [range, setRange] = useState<'30d' | '90d' | '6m' | 'all'>('all');
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const { success, error } = useToast();

  // 1. Fetch Executive Summary
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['reports', 'summary', range],
    queryFn: async () => {
      const res = await api.get('/reports/summary', { params: { range } });
      return res.data?.data as ReportsSummary;
    },
  });

  // 2. Fetch Spending Trends
  const {
    data: trendsData,
    isLoading: isTrendsLoading,
    refetch: refetchTrends,
  } = useQuery({
    queryKey: ['reports', 'trends'],
    queryFn: async () => {
      const res = await api.get('/reports/spending-trends');
      return res.data?.data as SpendingTrendItem[];
    },
  });

  // 3. Fetch Category Breakdown
  const {
    data: categoryData,
    isLoading: isCategoryLoading,
    refetch: refetchCategory,
  } = useQuery({
    queryKey: ['reports', 'categories'],
    queryFn: async () => {
      const res = await api.get('/reports/category-breakdown');
      return res.data?.data as CategoryBreakdownItem[];
    },
  });

  // 4. Fetch Vendor Performance
  const {
    data: vendorData,
    isLoading: isVendorLoading,
    refetch: refetchVendors,
  } = useQuery({
    queryKey: ['reports', 'vendors'],
    queryFn: async () => {
      const res = await api.get('/reports/vendor-performance');
      return res.data?.data as VendorPerformanceItem[];
    },
  });

  const handleRefreshAll = () => {
    refetchSummary();
    refetchTrends();
    refetchCategory();
    refetchVendors();
  };

  // CSV Export Download Handler
  const handleExport = async (type: 'spend' | 'vendors' | 'purchase_orders' | 'invoices', filename: string) => {
    try {
      setIsExporting(type);
      const res = await api.get(`/reports/export/${type}`, {
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      success('Export Complete', `${filename} successfully generated and downloaded.`);
    } catch (err) {
      error('Export Failed', getErrorMessage(err));
    } finally {
      setIsExporting(null);
    }
  };

  const trends = trendsData || [];
  const maxTrendSpend = Math.max(...trends.map((t) => Math.max(t.poSpend, t.invoicePaid)), 10000);
  const categories = categoryData || [];
  const vendors = vendorData || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-surface-2 border border-border-default flex items-center justify-center text-primary">
              <BarChart3 className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-primary">
                Procurement Reports & Analytics
              </h1>
              <p className="text-xs text-muted">
                Executive spend oversight, monthly commitments, and supplier scorecards.
              </p>
            </div>
          </div>
        </div>

        {/* Range Selector & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-border-default bg-surface-2 p-0.5 text-xs">
            <button
              onClick={() => setRange('30d')}
              className={cn(
                'px-2.5 py-1 rounded-md font-medium transition-colors',
                range === '30d' ? 'bg-surface text-primary shadow-xs' : 'text-muted hover:text-primary'
              )}
            >
              30 Days
            </button>
            <button
              onClick={() => setRange('90d')}
              className={cn(
                'px-2.5 py-1 rounded-md font-medium transition-colors',
                range === '90d' ? 'bg-surface text-primary shadow-xs' : 'text-muted hover:text-primary'
              )}
            >
              90 Days
            </button>
            <button
              onClick={() => setRange('6m')}
              className={cn(
                'px-2.5 py-1 rounded-md font-medium transition-colors',
                range === '6m' ? 'bg-surface text-primary shadow-xs' : 'text-muted hover:text-primary'
              )}
            >
              6 Months
            </button>
            <button
              onClick={() => setRange('all')}
              className={cn(
                'px-2.5 py-1 rounded-md font-medium transition-colors',
                range === 'all' ? 'bg-surface text-primary shadow-xs' : 'text-muted hover:text-primary'
              )}
            >
              All Time
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            className="flex items-center gap-1.5 text-xs h-8"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spend */}
        <Card className="p-4 bg-surface border-border-default space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium text-secondary">Total PO Commitments</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-primary">
              {isSummaryLoading ? '...' : formatINR(summaryData?.totalProcurementSpend || 0)}
            </div>
            <p className="text-[11px] text-muted mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{summaryData?.totalPOs || 0} Purchase Orders Issued</span>
            </p>
          </div>
        </Card>

        {/* Invoiced vs Paid */}
        <Card className="p-4 bg-surface border-border-default space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium text-secondary">Invoiced & Settled</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-primary">
              {isSummaryLoading ? '...' : formatINR(summaryData?.totalPaid || 0)}
            </div>
            <p className="text-[11px] text-muted mt-1 flex items-center justify-between">
              <span>Total Invoiced: {formatINR(summaryData?.totalInvoiced || 0)}</span>
            </p>
          </div>
        </Card>

        {/* Avg Order Value */}
        <Card className="p-4 bg-surface border-border-default space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium text-secondary">Average Order Value</span>
            <div className="w-7 h-7 rounded-lg bg-blue-950/40 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-primary">
              {isSummaryLoading ? '...' : formatINR(summaryData?.averageOrderValue || 0)}
            </div>
            <p className="text-[11px] text-muted mt-1">
              Based on executed purchase contracts
            </p>
          </div>
        </Card>

        {/* Vendors & Quotations */}
        <Card className="p-4 bg-surface border-border-default space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium text-secondary">Pipeline Activity</span>
            <div className="w-7 h-7 rounded-lg bg-purple-950/40 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-primary">
              {isSummaryLoading
                ? '...'
                : `${summaryData?.totalVendorsCount || 0} Vendors`}
            </div>
            <p className="text-[11px] text-muted mt-1">
              {summaryData?.activeRfqsCount || 0} Active RFQs • {summaryData?.totalQuotationsCount || 0} Quotes Received
            </p>
          </div>
        </Card>
      </div>

      {/* Visual Analytics Grid: Spending Trends + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Spending Trend Bar Chart (2 cols) */}
        <Card className="p-5 bg-surface border-border-default lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-default/60 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand" />
                Monthly Spending & Settlement Trends
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Comparison of approved Purchase Orders vs settled Invoices
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-secondary">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                <span>PO Spend</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-cyan-500 inline-block" />
                <span>Invoice Paid</span>
              </div>
            </div>
          </div>

          {isTrendsLoading ? (
            <div className="h-64 flex items-center justify-center text-xs text-muted">
              Loading trend visualization...
            </div>
          ) : trends.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-muted">
              <BarChart3 className="w-8 h-8 opacity-40 mb-2" />
              <p className="text-xs">No historical spending data recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="h-56 flex items-end gap-3 sm:gap-6 px-2">
                {trends.map((item) => {
                  const poHeight = Math.max(Math.round((item.poSpend / maxTrendSpend) * 100), 4);
                  const invHeight = Math.max(Math.round((item.invoicePaid / maxTrendSpend) * 100), 4);

                  return (
                    <div
                      key={item.month}
                      className="flex-1 flex flex-col items-center gap-2 h-full justify-end group"
                    >
                      {/* Tooltip Hover Value */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -translate-y-28 bg-surface-2 border border-border-default px-2.5 py-1.5 rounded shadow-xl text-[10px] text-primary whitespace-nowrap z-20 pointer-events-none">
                        <p className="font-semibold">{item.label}</p>
                        <p className="text-emerald-400">PO: {formatINR(item.poSpend)} ({item.poCount} POs)</p>
                        <p className="text-cyan-400">Paid: {formatINR(item.invoicePaid)}</p>
                      </div>

                      {/* Side by side bars */}
                      <div className="w-full flex items-end justify-center gap-1 h-44">
                        {/* PO Bar */}
                        <div
                          style={{ height: `${poHeight}%` }}
                          className="w-1/2 max-w-[28px] bg-emerald-500/80 hover:bg-emerald-400 rounded-t transition-all"
                          title={`PO Spend: ${formatINR(item.poSpend)}`}
                        />
                        {/* Invoice Paid Bar */}
                        <div
                          style={{ height: `${invHeight}%` }}
                          className="w-1/2 max-w-[28px] bg-cyan-500/80 hover:bg-cyan-400 rounded-t transition-all"
                          title={`Invoice Paid: ${formatINR(item.invoicePaid)}`}
                        />
                      </div>

                      {/* Month Label */}
                      <span className="text-[11px] text-muted font-medium truncate max-w-full">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Spend by Category Breakdown (1 col) */}
        <Card className="p-5 bg-surface border-border-default space-y-4">
          <div className="border-b border-border-default/60 pb-3">
            <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
              <PieChart className="w-4 h-4 text-purple-400" />
              Spend by Category
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Distribution of procurement expenditures
            </p>
          </div>

          {isCategoryLoading ? (
            <div className="h-64 flex items-center justify-center text-xs text-muted">
              Loading category breakdown...
            </div>
          ) : categories.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-muted">
              <PieChart className="w-8 h-8 opacity-40 mb-2" />
              <p className="text-xs">No categorised expenditure yet.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {categories.map((cat, idx) => {
                const colors = [
                  'bg-emerald-500',
                  'bg-blue-500',
                  'bg-purple-500',
                  'bg-amber-500',
                  'bg-cyan-500',
                ];
                const barColor = colors[idx % colors.length];

                return (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-primary">{cat.category}</span>
                      <span className="font-semibold text-primary">
                        {formatINR(cat.totalSpend)}{' '}
                        <span className="text-muted font-normal">({cat.percentage}%)</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden border border-border-default/40">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', barColor)}
                        style={{ width: `${Math.max(cat.percentage, 3)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-muted flex items-center justify-between">
                      <span>{cat.poCount} Orders</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Vendor Performance Leaderboard */}
      <Card className="bg-surface border-border-default overflow-hidden">
        <div className="p-4 border-b border-border-default/60 flex items-center justify-between bg-surface-2/30">
          <div>
            <h2 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-brand" />
              Vendor Performance & Fulfillment Scorecard
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Metrics calculated directly from live RFQ quotations, awarded purchase orders, and rating records
            </p>
          </div>
          <span className="text-xs text-secondary font-medium">
            {vendors.length} Partner Vendors
          </span>
        </div>

        {isVendorLoading ? (
          <div className="p-8 text-center text-xs text-muted">
            Loading vendor performance metrics...
          </div>
        ) : vendors.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            No vendor performance data available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/50 text-secondary border-b border-border-default/60 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3 pl-4">Vendor Partner</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Rating</th>
                  <th className="p-3 text-right">Orders Awarded</th>
                  <th className="p-3 text-right">Total Spend</th>
                  <th className="p-3 text-right">Quotes Submitted</th>
                  <th className="p-3 text-right pr-4">Win Rate %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/40">
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-surface-2/40 transition-colors">
                    <td className="p-3 pl-4">
                      <div className="font-semibold text-primary">{v.name}</div>
                      <div className="text-[10px] text-muted font-mono">{v.gstin}</div>
                    </td>
                    <td className="p-3 text-secondary">{v.category}</td>
                    <td className="p-3">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950/40 text-amber-300 border border-amber-500/20">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{v.rating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-medium text-primary">
                      {v.totalPOs}
                    </td>
                    <td className="p-3 text-right font-semibold text-emerald-400">
                      {formatINR(v.totalSpend)}
                    </td>
                    <td className="p-3 text-right text-secondary">
                      {v.quotationsSubmitted}
                    </td>
                    <td className="p-3 text-right pr-4">
                      <div className="inline-flex items-center gap-1 font-semibold text-primary">
                        <span>{v.winRate}%</span>
                        <div className="w-12 h-1.5 rounded-full bg-surface-2 overflow-hidden border border-border-default/40 hidden sm:block">
                          <div
                            className="h-full bg-brand rounded-full"
                            style={{ width: `${Math.min(v.winRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Export Center (4 Download Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Compliance & Procurement Export Center
          </h2>
          <span className="text-xs text-muted">Direct CSV downloads with complete metadata</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Export 1: Spend Summary */}
          <Card className="p-4 bg-surface border-border-default flex flex-col justify-between space-y-3 hover:border-brand/40 transition-colors">
            <div>
              <p className="text-xs font-semibold text-primary">Spend Summary Report</p>
              <p className="text-[11px] text-muted mt-1">
                Executive totals, PO count, settled amounts, and outstanding payables.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('spend', 'vendorbridge-spend-summary')}
              disabled={isExporting === 'spend'}
              className="w-full flex items-center justify-center gap-2 text-xs h-8"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting === 'spend' ? 'Exporting...' : 'Export Spend (CSV)'}
            </Button>
          </Card>

          {/* Export 2: Vendor Performance */}
          <Card className="p-4 bg-surface border-border-default flex flex-col justify-between space-y-3 hover:border-brand/40 transition-colors">
            <div>
              <p className="text-xs font-semibold text-primary">Vendor Scorecards</p>
              <p className="text-[11px] text-muted mt-1">
                Ratings, category spend, quote submission counts, and contract win rates.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('vendors', 'vendorbridge-vendor-scorecards')}
              disabled={isExporting === 'vendors'}
              className="w-full flex items-center justify-center gap-2 text-xs h-8"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting === 'vendors' ? 'Exporting...' : 'Export Vendors (CSV)'}
            </Button>
          </Card>

          {/* Export 3: Purchase Orders */}
          <Card className="p-4 bg-surface border-border-default flex flex-col justify-between space-y-3 hover:border-brand/40 transition-colors">
            <div>
              <p className="text-xs font-semibold text-primary">Purchase Orders Registry</p>
              <p className="text-[11px] text-muted mt-1">
                Complete PO register with PO number, vendor, status, issue date, and amount.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('purchase_orders', 'vendorbridge-purchase-orders')}
              disabled={isExporting === 'purchase_orders'}
              className="w-full flex items-center justify-center gap-2 text-xs h-8"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting === 'purchase_orders' ? 'Exporting...' : 'Export POs (CSV)'}
            </Button>
          </Card>

          {/* Export 4: Invoices Registry */}
          <Card className="p-4 bg-surface border-border-default flex flex-col justify-between space-y-3 hover:border-brand/40 transition-colors">
            <div>
              <p className="text-xs font-semibold text-primary">Invoices & Tax Ledger</p>
              <p className="text-[11px] text-muted mt-1">
                All tax invoices, PO links, tax breakdowns, settlement status, and paid dates.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('invoices', 'vendorbridge-invoices-tax-ledger')}
              disabled={isExporting === 'invoices'}
              className="w-full flex items-center justify-center gap-2 text-xs h-8"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting === 'invoices' ? 'Exporting...' : 'Export Invoices (CSV)'}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;
