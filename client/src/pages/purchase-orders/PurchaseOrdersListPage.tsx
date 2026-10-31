import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  FileCheck2,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Plus,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

export function PurchaseOrdersListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const statusTab = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState(search);

  // Fetch POs
  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', { page, search, statusTab }],
    queryFn: async () => {
      const res = await api.get('/purchase-orders', {
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
  const counts = data?.counts || { all: 0, issued: 0, confirmed: 0, delivered: 0, cancelled: 0 };

  // Generate Invoice Mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: async (poId: string) => {
      const res = await api.post('/invoices/generate', { purchaseOrderId: poId });
      return res.data?.data || res.data;
    },
    onSuccess: (newInv) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      success(`Invoice ${newInv.invoiceNumber || ''} generated successfully.`);
      if (newInv?.id) {
        navigate(`/invoices/${newInv.id}`);
      }
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || 'Failed to generate invoice.');
    },
  });

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
          <h1 className="text-2xl font-bold text-primary tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-secondary mt-1">
            Authoritative purchase orders generated from approved procurement quotations.
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary uppercase tracking-wider">
              Issued POs
            </span>
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{counts.issued}</span>
            <span className="text-xs text-brand-400">Active Orders</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary uppercase tracking-wider">
              Confirmed
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{counts.confirmed}</span>
            <span className="text-xs text-blue-400">Vendor Accepted</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary uppercase tracking-wider">
              Delivered
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{counts.delivered}</span>
            <span className="text-xs text-emerald-400">Fulfilled</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary uppercase tracking-wider">
              Total Issued
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{counts.all}</span>
            <span className="text-xs text-secondary">Registry Count</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-border pb-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { key: '', label: 'All Orders', count: counts.all },
            { key: 'ISSUED', label: 'Issued', count: counts.issued },
            { key: 'CONFIRMED', label: 'Confirmed', count: counts.confirmed },
            { key: 'DELIVERED', label: 'Delivered', count: counts.delivered },
            { key: 'CANCELLED', label: 'Cancelled', count: counts.cancelled },
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
              placeholder="Search PO number, RFQ or vendor..."
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
          Loading purchase orders...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8">
          <EmptyState
            icon={ShoppingBag}
            title="No Purchase Orders Found"
            description={
              search || statusTab
                ? 'No purchase orders match your filter criteria.'
                : 'Approved procurement quotations will automatically generate purchase orders here.'
            }
            actionLabel="View Approvals"
            onAction={() => navigate('/approvals')}
          />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border text-secondary font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Source RFQ</th>
                  <th className="py-3 px-4">Items / Terms</th>
                  <th className="py-3 px-4">Grand Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item: any) => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/15 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/purchase-orders/${item.id}`)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-primary group-hover:text-brand-400 transition-colors">
                        {item.poNumber}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-primary">
                            {item.vendor?.name || 'Vendor'}
                          </span>
                          <span className="text-[11px] text-secondary mt-0.5">
                            {item.vendor?.category || 'Supplier'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-primary">
                            {item.rfq?.title || 'RFQ'}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground mt-0.5">
                            {item.rfq?.code}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-secondary">
                        <span className="block font-medium text-primary">
                          {item.items?.length || 0} line item{item.items?.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          Net {item.paymentTermsDays || 30}d payment
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-emerald-400 font-mono">
                          {formatMoney(item.grandTotal)}
                        </span>
                        <span className="block text-[10px] text-muted-foreground mt-0.5">
                          incl. 18% GST
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="py-3.5 px-4 text-secondary">
                        {formatDate(item.issueDate || item.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/purchase-orders/${item.id}`}>
                            <Button size="sm" variant="outline" className="h-7 text-xs">
                              View PO & Invoice
                            </Button>
                          </Link>
                          {!item.invoice && user?.role !== 'VENDOR' && (
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={generateInvoiceMutation.isPending}
                              onClick={() => generateInvoiceMutation.mutate(item.id)}
                              className="h-7 text-xs bg-brand-500 hover:bg-brand-600"
                            >
                              Gen Invoice
                            </Button>
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
                <span className="font-semibold text-primary">{totalPages}</span> ({total} orders)
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
