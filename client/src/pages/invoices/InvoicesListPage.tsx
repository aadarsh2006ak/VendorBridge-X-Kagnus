import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Building2,
  Calendar,
  CreditCard,
  Layers,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

export function InvoicesListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const statusTab = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState(search);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Fetch Invoices
  const { data, isLoading } = useQuery({
    queryKey: ['invoices', { page, search, statusTab }],
    queryFn: async () => {
      const res = await api.get('/invoices', {
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
  const counts = data?.counts || { all: 0, pending: 0, paid: 0, cancelled: 0 };

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

  const handleDownloadPdf = async (invoiceId: string, invoiceNum: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDownloadingId(invoiceId);
      const res = await api.get(`/invoices/${invoiceId}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Invoice-${invoiceNum || invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      success('PDF downloaded successfully.');
    } catch (err: any) {
      toastError('Failed to download invoice PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatMoney = (val: number) => {
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
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
          <h1 className="text-2xl font-bold text-primary tracking-tight">Invoices</h1>
          <p className="text-sm text-secondary mt-1">
            Official billing invoices linked to purchase orders, tax computations, and settlement tracking.
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary uppercase tracking-wider">
              Pending Payment
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{counts.pending}</span>
            <span className="text-xs text-amber-400">Awaiting Settlement</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary uppercase tracking-wider">
              Paid Invoices
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{counts.paid}</span>
            <span className="text-xs text-emerald-400">Settled</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary uppercase tracking-wider">
              Cancelled Invoices
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{counts.cancelled}</span>
            <span className="text-xs text-secondary">Voided</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary uppercase tracking-wider">
              Total Invoices
            </span>
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{counts.all}</span>
            <span className="text-xs text-secondary">Total Records</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-border pb-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { key: '', label: 'All Invoices', count: counts.all },
            { key: 'PENDING_PAYMENT', label: 'Pending Payment', count: counts.pending },
            { key: 'PAID', label: 'Paid', count: counts.paid },
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
              placeholder="Search invoice #, PO # or vendor..."
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
          Loading invoices...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8">
          <EmptyState
            icon={FileText}
            title="No Invoices Found"
            description={
              search || statusTab
                ? 'No invoices match your filter criteria.'
                : 'Invoices generated from confirmed purchase orders will be listed here.'
            }
            actionLabel="View Purchase Orders"
            onAction={() => navigate('/purchase-orders')}
          />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border text-secondary font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">PO Reference</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Grand Total</th>
                  <th className="py-3 px-4">Tax (18%)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item: any) => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/15 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/invoices/${item.id}`)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-primary group-hover:text-brand-400 transition-colors">
                        {item.invoiceNumber}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        {item.purchaseOrder?.poNumber || '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-primary">
                            {item.vendor?.name || 'Vendor'}
                          </span>
                          <span className="text-[11px] text-secondary mt-0.5 font-mono">
                            {item.vendor?.gstNumber || 'GST: N/A'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-emerald-400 font-mono">
                          {formatMoney(item.grandTotal)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-secondary">
                        {formatMoney(item.taxAmount)}
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="py-3.5 px-4 text-secondary">
                        {formatDate(item.dueDate)}
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleDownloadPdf(item.id, item.invoiceNumber, e)}
                            disabled={downloadingId === item.id}
                            className="h-7 text-xs px-2 text-secondary hover:text-primary"
                            title="Download PDF"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          <Link to={`/invoices/${item.id}`}>
                            <Button size="sm" variant="outline" className="h-7 text-xs">
                              View Document
                            </Button>
                          </Link>
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
                <span className="font-semibold text-primary">{totalPages}</span> ({total} invoices)
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
