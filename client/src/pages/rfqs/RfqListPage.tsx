import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Send,
  XCircle,
  RotateCcw,
  Layers,
  Calendar,
  Building2,
  Clock,
  ArrowRight,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

const CATEGORIES = [
  'All Categories',
  'IT Hardware',
  'IT Services',
  'Furniture',
  'Stationery',
  'Logistics',
  'Construction',
  'Other',
];

const STATUS_TABS = [
  { key: '', label: 'All RFQs' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'OPEN', label: 'Open' },
  { key: 'CLOSED', label: 'Closed' },
  { key: 'QUOTATION_SELECTED', label: 'Selected' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export function RfqListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const isVendor = user?.role === 'VENDOR';

  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const statusTab = searchParams.get('status') || '';
  const category = searchParams.get('category') || 'All Categories';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState(search);

  // Action Modals State
  const [rfqToCancel, setRfqToCancel] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rfqToReopen, setRfqToReopen] = useState<any | null>(null);
  const [newDeadline, setNewDeadline] = useState('');

  // Fetch RFQs for Staff (Admin, Procurement Officer, Manager)
  const { data: staffData, isLoading: isLoadingStaff } = useQuery({
    queryKey: ['rfqs', { page, search, statusTab, category }],
    queryFn: async () => {
      const res = await api.get('/rfqs', {
        params: {
          page,
          limit: 10,
          search: search || undefined,
          status: statusTab || undefined,
          category: category !== 'All Categories' ? category : undefined,
        },
      });
      return res.data;
    },
    enabled: !isVendor,
  });

  // Fetch RFQs for Vendor
  const { data: vendorRfqs, isLoading: isLoadingVendor } = useQuery({
    queryKey: ['vendor-portal', 'rfqs'],
    queryFn: async () => {
      const res = await api.get('/vendor-portal/rfqs');
      return res.data.data;
    },
    enabled: isVendor,
  });

  // Update query params helper
  const updateParam = (key: string, val: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!val) {
        next.delete(key);
      } else {
        next.set(key, val);
      }
      next.set('page', '1');
      return next;
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('search', searchInput.trim());
  };

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.post(`/rfqs/${id}/publish`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      success('RFQ published successfully! Assigned vendors can now submit bids.');
    },
    onError: (err) => {
      toastError(getErrorMessage(err));
    },
  });

  // Close mutation
  const closeMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.post(`/rfqs/${id}/close`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      success('RFQ closed successfully. No further quotes can be submitted.');
    },
    onError: (err) => {
      toastError(getErrorMessage(err));
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!rfqToCancel) return;
      return (
        await api.post(`/rfqs/${rfqToCancel.id}/cancel`, {
          reason: cancelReason.trim(),
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      success('RFQ has been cancelled.');
      setRfqToCancel(null);
      setCancelReason('');
    },
    onError: (err) => {
      toastError(getErrorMessage(err));
    },
  });

  // Reopen mutation
  const reopenMutation = useMutation({
    mutationFn: async () => {
      if (!rfqToReopen) return;
      return (
        await api.post(`/rfqs/${rfqToReopen.id}/reopen`, {
          deadline: new Date(newDeadline).toISOString(),
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      success('RFQ reopened successfully with extended deadline.');
      setRfqToReopen(null);
      setNewDeadline('');
    },
    onError: (err) => {
      toastError(getErrorMessage(err));
    },
  });

  // VENDOR VIEW
  if (isVendor) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-primary">Assigned RFQs & Invitations</h1>
          <p className="text-sm text-secondary mt-1">
            Review RFQs invited by procurement and submit competitive quotations before deadlines.
          </p>
        </div>

        {isLoadingVendor ? (
          <div className="p-12 text-center text-sm text-secondary">
            Loading your assigned procurement requests...
          </div>
        ) : !vendorRfqs || vendorRfqs.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No Active RFQs Assigned"
            description="Your company has not been invited to any open procurement requests yet."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vendorRfqs.map((rfq: any) => {
              const isDeadlinePassed = new Date(rfq.deadline).getTime() <= Date.now();
              return (
                <div
                  key={rfq.id}
                  className="bg-surface border border-border-default rounded-xl p-5 hover:border-brand/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-2 text-brand">
                        {rfq.code}
                      </span>
                      <StatusBadge status={rfq.effectiveStatus} />
                    </div>

                    <div>
                      <h3 className="font-semibold text-primary text-base line-clamp-1">
                        {rfq.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-surface-2 text-secondary">
                          {rfq.category}
                        </span>
                        <span className="text-xs text-muted">
                          {rfq.itemCount} items requested
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-2/60 border border-border-default/60 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-secondary flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Deadline:
                        </span>
                        <span
                          className={cn(
                            'font-medium',
                            isDeadlinePassed ? 'text-status-danger' : 'text-primary'
                          )}
                        >
                          {new Date(rfq.deadline).toLocaleDateString()} at{' '}
                          {new Date(rfq.deadline).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-secondary">Your Quote Status:</span>
                        {rfq.quotation ? (
                          <span className="font-medium text-emerald-400">
                            Submitted (₹{rfq.quotation.grandTotal.toLocaleString('en-IN')})
                          </span>
                        ) : (
                          <span className="text-amber-400 font-medium">Pending Quote</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-border-default flex items-center justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/vendor-portal/rfqs/${rfq.id}/quote`)}
                      className="gap-2"
                    >
                      {rfq.quotation ? 'Edit / View Quotation' : 'Submit Quotation'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // PROCUREMENT OFFICER / ADMIN / MANAGER VIEW
  const rfqs = staffData?.data || [];
  const meta = staffData?.meta;
  const counts = staffData?.counts || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Requests for Quotation (RFQs)</h1>
          <p className="text-sm text-secondary mt-1">
            Create procurement requests, invite vendors, and compare submitted quotations.
          </p>
        </div>

        {(user?.role === 'ADMIN' || user?.role === 'PROCUREMENT_OFFICER') && (
          <Button
            variant="primary"
            onClick={() => navigate('/rfqs/new')}
            className="gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create RFQ
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border-default">
        {STATUS_TABS.map((tab) => {
          const isActive = statusTab === tab.key;
          const count =
            tab.key === ''
              ? counts.all
              : tab.key === 'DRAFT'
              ? counts.draft
              : tab.key === 'OPEN'
              ? counts.open
              : tab.key === 'CLOSED'
              ? counts.closed
              : tab.key === 'QUOTATION_SELECTED'
              ? counts.selected
              : counts.cancelled;

          return (
            <button
              key={tab.key}
              onClick={() => updateParam('status', tab.key)}
              className={cn(
                'px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap',
                isActive
                  ? 'bg-brand/10 text-brand font-semibold shadow-sm'
                  : 'text-secondary hover:text-primary hover:bg-surface-2'
              )}
            >
              <span>{tab.label}</span>
              {count !== undefined && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px]',
                    isActive ? 'bg-brand text-white' : 'bg-surface-2 text-muted'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-border-default">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by RFQ code or title..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-surface-2 border border-border-default rounded-lg text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={category}
            onChange={(e) => updateParam('category', e.target.value)}
            className="px-3 py-1.5 bg-surface-2 border border-border-default rounded-lg text-xs text-primary focus:outline-none focus:border-brand"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* RFQ Table */}
      {isLoadingStaff ? (
        <div className="p-16 text-center text-sm text-secondary bg-surface rounded-xl border border-border-default">
          Loading requests for quotation...
        </div>
      ) : rfqs.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No RFQs Found"
          description="No procurement requests match your current filters. Create an RFQ to get started."
          actionLabel={
            user?.role === 'ADMIN' || user?.role === 'PROCUREMENT_OFFICER'
              ? 'Create RFQ'
              : undefined
          }
          onAction={() => navigate('/rfqs/new')}
        />
      ) : (
        <div className="bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2/60 text-secondary border-b border-border-default text-xs uppercase font-medium">
                <tr>
                  <th className="px-5 py-3.5">RFQ Code</th>
                  <th className="px-5 py-3.5">Title & Category</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Deadline</th>
                  <th className="px-5 py-3.5">Items / Vendors</th>
                  <th className="px-5 py-3.5">Quotes</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {rfqs.map((rfq: any) => {
                  const isDeadlinePassed =
                    new Date(rfq.deadline).getTime() <= Date.now();
                  const hasQuotes = rfq.quotationsCount > 0;

                  return (
                    <tr
                      key={rfq.id}
                      className="hover:bg-surface-2/30 transition-colors group"
                    >
                      <td className="px-5 py-4 font-mono font-medium text-brand text-xs">
                        <Link
                          to={`/rfqs/${rfq.id}`}
                          className="hover:underline flex items-center gap-1"
                        >
                          {rfq.code}
                        </Link>
                      </td>

                      <td className="px-5 py-4 max-w-xs">
                        <div className="font-medium text-primary line-clamp-1">
                          {rfq.title}
                        </div>
                        <div className="text-xs text-secondary mt-0.5">
                          {rfq.category}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={rfq.effectiveStatus} />
                      </td>

                      <td className="px-5 py-4 text-xs">
                        <div
                          className={cn(
                            'font-medium',
                            isDeadlinePassed && rfq.status === 'OPEN'
                              ? 'text-status-danger'
                              : 'text-primary'
                          )}
                        >
                          {new Date(rfq.deadline).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-muted">
                          {new Date(rfq.deadline).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs text-secondary">
                        <div>{rfq.itemsCount} items</div>
                        <div className="text-[11px] text-muted">
                          {rfq.vendorsCount} invited
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs font-medium">
                        {hasQuotes ? (
                          <span className="text-emerald-400 font-medium">
                            {rfq.quotationsCount} Submitted
                          </span>
                        ) : (
                          <span className="text-muted">None</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Compare Quotes Button */}
                          {hasQuotes && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/rfqs/${rfq.id}/comparison`)}
                              className="text-xs py-1 px-2.5 gap-1.5 text-brand border-brand/30 hover:bg-brand/10"
                              title="Compare Quotations Matrix (Screen 7)"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              Compare
                            </Button>
                          )}

                          {/* Detail Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/rfqs/${rfq.id}`)}
                            className="p-1.5 text-secondary hover:text-primary"
                            title="View RFQ details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {/* Edit (Draft only) */}
                          {rfq.status === 'DRAFT' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/rfqs/${rfq.id}/edit`)}
                              className="p-1.5 text-secondary hover:text-brand"
                              title="Edit Draft"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}

                          {/* Publish (Draft only) */}
                          {rfq.status === 'DRAFT' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => publishMutation.mutate(rfq.id)}
                              className="p-1.5 text-secondary hover:text-emerald-400"
                              title="Publish RFQ"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          )}

                          {/* Close (Open only) */}
                          {rfq.status === 'OPEN' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => closeMutation.mutate(rfq.id)}
                              className="p-1.5 text-secondary hover:text-amber-400"
                              title="Close Submissions"
                            >
                              <Clock className="w-4 h-4" />
                            </Button>
                          )}

                          {/* Reopen (Closed only) */}
                          {rfq.status === 'CLOSED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRfqToReopen(rfq);
                                const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                                d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                                setNewDeadline(d.toISOString().slice(0, 16));
                              }}
                              className="p-1.5 text-secondary hover:text-blue-400"
                              title="Reopen RFQ with new deadline"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}

                          {/* Cancel (Draft, Open, Closed) */}
                          {(rfq.status === 'DRAFT' ||
                            rfq.status === 'OPEN' ||
                            rfq.status === 'CLOSED') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRfqToCancel(rfq)}
                              className="p-1.5 text-secondary hover:text-status-danger"
                              title="Cancel RFQ"
                            >
                              <XCircle className="w-4 h-4" />
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
        </div>
      )}

      {/* Cancel RFQ Modal */}
      {rfqToCancel && (
        <Modal
          isOpen={Boolean(rfqToCancel)}
          onClose={() => setRfqToCancel(null)}
          title={`Cancel RFQ: ${rfqToCancel.code}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-secondary">
              Please provide a clear reason for cancelling this RFQ. Assigned vendors
              will be notified of the cancellation.
            </p>
            <Textarea
              label="Cancellation Reason"
              placeholder="e.g. Budget reallocation, specifications revised, or procurement requirement retracted."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              required
            />
            <div className="flex justify-end gap-3 pt-3">
              <Button variant="ghost" onClick={() => setRfqToCancel(null)}>
                Back
              </Button>
              <Button
                variant="danger"
                onClick={() => cancelMutation.mutate()}
                isLoading={cancelMutation.isPending}
                disabled={!cancelReason.trim() || cancelReason.length < 3}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reopen RFQ Modal */}
      {rfqToReopen && (
        <Modal
          isOpen={Boolean(rfqToReopen)}
          onClose={() => setRfqToReopen(null)}
          title={`Reopen RFQ: ${rfqToReopen.code}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-secondary">
              Set a new future deadline to reopen this RFQ for additional vendor quotation submissions.
            </p>
            <Input
              label="New Future Submission Deadline"
              type="datetime-local"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              required
            />
            <div className="flex justify-end gap-3 pt-3">
              <Button variant="ghost" onClick={() => setRfqToReopen(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => reopenMutation.mutate()}
                isLoading={reopenMutation.isPending}
                disabled={!newDeadline || new Date(newDeadline).getTime() <= Date.now()}
              >
                Reopen RFQ
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
