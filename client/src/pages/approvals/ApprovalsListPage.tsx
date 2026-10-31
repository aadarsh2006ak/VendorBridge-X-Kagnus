import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Filter,
  ArrowRight,
  Building2,
  Calendar,
  Layers,
  AlertCircle,
  FileCheck2,
  ShoppingBag,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { cn } from '../../lib/utils';

export function ApprovalsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const statusTab = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState(search);

  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN';

  // Fetch approvals
  const { data, isLoading } = useQuery({
    queryKey: ['approvals', { page, search, statusTab }],
    queryFn: async () => {
      const res = await api.get('/approvals', {
        params: {
          page,
          limit: 10,
          search: search || undefined,
          status: statusTab || undefined,
        },
      });
      return res.data?.data || res.data;
    },
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const counts = data?.counts || { all: 0, pending: 0, approved: 0, rejected: 0 };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (searchInput.trim()) {
        next.set('search', searchInput.trim());
      } else {
        next.delete('search');
      }
      next.set('page', '1');
      return next;
    });
  };

  const handleTabChange = (key: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (key) {
        next.set('status', key);
      } else {
        next.delete('status');
      }
      next.set('page', '1');
      return next;
    });
  };

  const formatMoney = (val: number) => {
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Procurement Approvals</h1>
          <p className="text-sm text-secondary mt-1">
            Review quotation selections, verify procurement budgets, and issue purchase orders.
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary uppercase tracking-wider">
              Pending Approvals
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{counts.pending}</span>
            <span className="text-xs text-amber-400">Requires Action</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary uppercase tracking-wider">
              Approved Requests
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{counts.approved}</span>
            <span className="text-xs text-emerald-400">PO Generated</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary uppercase tracking-wider">
              Rejected Requests
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{counts.rejected}</span>
            <span className="text-xs text-secondary">Returned</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary uppercase tracking-wider">
              Total Evaluated
            </span>
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{counts.all}</span>
            <span className="text-xs text-secondary">Overall History</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-border pb-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { key: '', label: 'All Requests', count: counts.all },
            { key: 'PENDING', label: 'Pending Approval', count: counts.pending },
            { key: 'APPROVED', label: 'Approved', count: counts.approved },
            { key: 'REJECTED', label: 'Rejected', count: counts.rejected },
          ].map((tab) => {
            const isActive = statusTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  'px-3.5 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap',
                  isActive
                    ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                    : 'text-secondary hover:text-primary hover:bg-card border border-transparent'
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 text-[10px] rounded-full font-mono',
                    isActive ? 'bg-brand-500/20 text-brand-300' : 'bg-border text-muted-foreground'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-sm w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search RFQ, vendor or code..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-input/40 text-primary placeholder:text-muted-foreground focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="h-8 px-3 text-xs">
            Filter
          </Button>
        </form>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-secondary bg-card rounded-xl border border-border">
          Loading approval requests...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8">
          <EmptyState
            icon={FileCheck2}
            title="No Approval Requests Found"
            description={
              search || statusTab
                ? 'No procurement requests match your filter criteria.'
                : 'When a quotation is selected from RFQ comparison, it will appear here for manager review.'
            }
            actionLabel="View Open RFQs"
            onAction={() => navigate('/rfqs')}
          />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border text-secondary font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">RFQ Details</th>
                  <th className="py-3 px-4">Selected Vendor</th>
                  <th className="py-3 px-4">Grand Total</th>
                  <th className="py-3 px-4">Current Step</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Requested On</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item: any) => {
                  const currentStepObj = item.steps?.find(
                    (s: any) => s.stepNumber === item.currentStep
                  );

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/15 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/approvals/${item.id}`)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-primary group-hover:text-brand-400 transition-colors">
                            {item.rfq?.title || 'RFQ Request'}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground mt-0.5">
                            {item.rfq?.code}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-primary">
                            {item.quotation?.vendor?.name || 'Assigned Vendor'}
                          </span>
                          <span className="text-[11px] text-secondary mt-0.5">
                            {item.quotation?.vendor?.category || 'Vendor Partner'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-emerald-400 font-mono">
                            {formatMoney(item.quotation?.grandTotal || 0)}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            {item.quotation?.deliveryDays ? `${item.quotation.deliveryDays}d delivery` : 'Immediate'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-muted/60 border border-border text-primary">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-400"></span>
                          Step {item.currentStep}: {currentStepObj?.title || 'Review'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="py-3.5 px-4 text-secondary">
                        {formatDate(item.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {item.status === 'PENDING' && isManagerOrAdmin ? (
                            <Link to={`/approvals/${item.id}`}>
                              <Button
                                size="sm"
                                variant="primary"
                                className="h-7 text-xs bg-brand-500 hover:bg-brand-600 font-medium"
                              >
                                Review & Decide
                              </Button>
                            </Link>
                          ) : item.purchaseOrder ? (
                            <Link to={`/purchase-orders/${item.purchaseOrder.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-brand-500/40 text-brand-400 hover:bg-brand-500/10 font-medium inline-flex items-center gap-1"
                              >
                                <ShoppingBag className="w-3 h-3" />
                                View PO
                              </Button>
                            </Link>
                          ) : (
                            <Link to={`/approvals/${item.id}`}>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-secondary">
                                View Details
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
              <span className="text-xs text-secondary">
                Showing Page <span className="font-semibold text-primary">{page}</span> of{' '}
                <span className="font-semibold text-primary">{totalPages}</span> ({total} requests)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() =>
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set('page', String(page - 1));
                      return next;
                    })
                  }
                  className="h-7 px-3 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set('page', String(page + 1));
                      return next;
                    })
                  }
                  className="h-7 px-3 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
