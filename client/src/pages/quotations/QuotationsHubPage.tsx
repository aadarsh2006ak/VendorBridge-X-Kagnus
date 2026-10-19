import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Layers,
  Search,
  Filter,
  Eye,
  ArrowRight,
  CheckCircle2,
  Clock,
  Building2,
  TrendingDown,
  Award,
  Calendar,
  AlertCircle,
  FileText,
  DollarSign,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
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

export function QuotationsHubPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isVendor = user?.role === 'VENDOR';

  // Filters & Search
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [tab, setTab] = useState<'all' | 'ready' | 'single' | 'awarded' | 'zero'>('all');

  // Fetch RFQs for Staff (Admin, Procurement Officer, Manager)
  const { data: staffData, isLoading: isLoadingStaff } = useQuery({
    queryKey: ['quotations-staff-rfqs'],
    queryFn: async () => {
      const res = await api.get('/rfqs', {
        params: { limit: 100 },
      });
      return res.data;
    },
    enabled: !isVendor,
  });

  // Fetch Assigned RFQs for Vendor
  const { data: vendorRfqs, isLoading: isLoadingVendor } = useQuery({
    queryKey: ['vendor-portal', 'rfqs'],
    queryFn: async () => {
      const res = await api.get('/vendor-portal/rfqs');
      return res.data.data;
    },
    enabled: isVendor,
  });

  // ---------------------------------------------------------------------------
  // VENDOR VIEW
  // ---------------------------------------------------------------------------
  if (isVendor) {
    const list = vendorRfqs || [];
    const submittedCount = list.filter((r: any) => r.quotation?.status === 'SUBMITTED').length;
    const awaitingCount = list.filter((r: any) => !r.quotation || r.quotation.status === 'DRAFT').length;
    const awardedCount = list.filter((r: any) => r.status === 'QUOTATION_SELECTED').length;

    const filteredList = list.filter((r: any) => {
      const matchesSearch =
        search === '' ||
        r.code.toLowerCase().includes(search.toLowerCase()) ||
        r.title.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'All Categories' || r.category === category;
      return matchesSearch && matchesCategory;
    });

    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-brand/10 border border-brand/20 text-brand">
                <Layers className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold text-primary">Vendor Quotations & Bids</h1>
            </div>
            <p className="text-secondary text-sm mt-1">
              Review assigned procurement RFQs, submit competitive quotations before deadlines, and track bid statuses.
            </p>
          </div>
        </div>

        {/* Vendor Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface border border-border-default rounded-xl p-4">
            <div className="text-xs text-secondary font-medium flex items-center justify-between">
              <span>Total RFQs Invited</span>
              <Building2 className="w-4 h-4 text-muted" />
            </div>
            <div className="text-2xl font-bold text-primary mt-2">{list.length}</div>
            <div className="text-[11px] text-muted mt-0.5">Assigned by procurement</div>
          </div>

          <div className="bg-surface border border-border-default rounded-xl p-4">
            <div className="text-xs text-secondary font-medium flex items-center justify-between">
              <span>Quotations Submitted</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2">{submittedCount}</div>
            <div className="text-[11px] text-muted mt-0.5">Commercial offers sent</div>
          </div>

          <div className="bg-surface border border-border-default rounded-xl p-4">
            <div className="text-xs text-secondary font-medium flex items-center justify-between">
              <span>Pending Submission</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-2">{awaitingCount}</div>
            <div className="text-[11px] text-muted mt-0.5">Awaiting price quotes</div>
          </div>

          <div className="bg-surface border border-border-default rounded-xl p-4">
            <div className="text-xs text-secondary font-medium flex items-center justify-between">
              <span>Contracts Awarded</span>
              <Award className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-400 mt-2">{awardedCount}</div>
            <div className="text-[11px] text-muted mt-0.5">Won procurement RFQs</div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by RFQ code or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface border border-border-default rounded-lg text-sm text-primary placeholder:text-muted focus:outline-none focus:border-brand"
            />
          </div>

          <div className="w-full sm:w-56 shrink-0">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border-default rounded-lg text-sm text-primary focus:outline-none focus:border-brand"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Vendor Table */}
        <div className="bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm">
          {isLoadingVendor ? (
            <div className="p-8 text-center text-sm text-muted">Loading assigned quotations...</div>
          ) : filteredList.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Layers}
                title="No assigned RFQs found"
                description="You currently have no RFQs awaiting quotations or matching your active search."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2 text-secondary text-xs uppercase tracking-wider border-b border-border-default">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">RFQ Code</th>
                    <th className="px-5 py-3.5 font-semibold">Title & Category</th>
                    <th className="px-5 py-3.5 font-semibold">Deadline</th>
                    <th className="px-5 py-3.5 font-semibold">Quotation Status</th>
                    <th className="px-5 py-3.5 font-semibold">My Quoted Total</th>
                    <th className="px-5 py-3.5 font-semibold">Lead Time</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {filteredList.map((rfq: any) => {
                    const hasQuote = rfq.quotation && rfq.quotation.status === 'SUBMITTED';
                    const isPassed = new Date(rfq.deadline).getTime() <= Date.now();
                    const canSubmit = !isPassed && (rfq.status === 'OPEN' || rfq.effectiveStatus === 'OPEN');

                    return (
                      <tr key={rfq.id} className="hover:bg-surface-2/40 transition-colors">
                        <td className="px-5 py-4 font-mono font-medium text-brand text-xs">
                          {rfq.code}
                        </td>
                        <td className="px-5 py-4 max-w-xs">
                          <div className="font-medium text-primary line-clamp-1">{rfq.title}</div>
                          <div className="text-xs text-secondary mt-0.5">{rfq.category} · {rfq.itemCount} items</div>
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <div className={cn('font-medium', isPassed ? 'text-status-danger' : 'text-primary')}>
                            {new Date(rfq.deadline).toLocaleDateString()}
                          </div>
                          <div className="text-[11px] text-muted">
                            {new Date(rfq.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {hasQuote ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Submitted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock className="w-3 h-3" /> Awaiting Quote
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-medium text-xs">
                          {hasQuote ? (
                            <span className="text-primary font-semibold">
                              ₹{Number(rfq.quotation.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-secondary">
                          {hasQuote && rfq.quotation.deliveryDays ? (
                            <span>{rfq.quotation.deliveryDays} days</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            variant={hasQuote ? 'outline' : 'primary'}
                            size="sm"
                            onClick={() => navigate(`/vendor-portal/rfqs/${rfq.id}/quote`)}
                            className="text-xs py-1 px-3 gap-1.5"
                          >
                            {hasQuote ? (canSubmit ? 'Edit Quote' : 'View Quote') : 'Submit Quote'}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STAFF VIEW (Admin, Procurement Officer, Manager)
  // ---------------------------------------------------------------------------
  const rawRfqs = staffData?.data || [];

  // Compute stat metrics
  const getQuotesCount = (r: any) =>
    r.quotesCount !== undefined
      ? r.quotesCount
      : (r.quotations || []).filter((q: any) => q.status === 'SUBMITTED' || q.status === 'ACCEPTED').length;

  const totalQuotesCount = rawRfqs.reduce((acc: number, r: any) => acc + getQuotesCount(r), 0);
  const rfqsWithQuotesCount = rawRfqs.filter((r: any) => getQuotesCount(r) > 0).length;
  const readyToCompareCount = rawRfqs.filter((r: any) => getQuotesCount(r) >= 2).length;
  const awardedRfqsCount = rawRfqs.filter((r: any) => r.status === 'QUOTATION_SELECTED').length;

  // Filter list
  const filteredRfqs = rawRfqs.filter((r: any) => {
    const quotesCount = getQuotesCount(r);
    const matchesSearch =
      search === '' ||
      r.code.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All Categories' || r.category === category;

    if (!matchesSearch || !matchesCategory) return false;

    if (tab === 'ready') return quotesCount >= 2;
    if (tab === 'single') return quotesCount === 1;
    if (tab === 'zero') return quotesCount === 0;
    if (tab === 'awarded') return r.status === 'QUOTATION_SELECTED';
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand/10 border border-brand/20 text-brand">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-primary">Vendor Quotations & Evaluation</h1>
          </div>
          <p className="text-secondary text-sm mt-1">
            Monitor incoming vendor proposals, evaluate pricing breakdowns, and launch side-by-side comparison matrices (Screen 7).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/rfqs')}
            className="text-xs gap-1.5"
          >
            <FileText className="w-4 h-4" />
            View All RFQs
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/rfqs/new')}
            className="text-xs gap-1.5"
          >
            Create New RFQ
          </Button>
        </div>
      </div>

      {/* Staff Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border-default rounded-xl p-4">
          <div className="text-xs text-secondary font-medium flex items-center justify-between">
            <span>Total Proposals Received</span>
            <Layers className="w-4 h-4 text-brand" />
          </div>
          <div className="text-2xl font-bold text-brand mt-2">{totalQuotesCount}</div>
          <div className="text-[11px] text-muted mt-0.5">Submitted across all RFQs</div>
        </div>

        <div className="bg-surface border border-border-default rounded-xl p-4">
          <div className="text-xs text-secondary font-medium flex items-center justify-between">
            <span>RFQs with Proposals</span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">{rfqsWithQuotesCount}</div>
          <div className="text-[11px] text-muted mt-0.5">Active vendor bids</div>
        </div>

        <div className="bg-surface border border-border-default rounded-xl p-4">
          <div className="text-xs text-secondary font-medium flex items-center justify-between">
            <span>Ready for Comparison</span>
            <TrendingDown className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400 mt-2">{readyToCompareCount}</div>
          <div className="text-[11px] text-muted mt-0.5">≥ 2 competing proposals</div>
        </div>

        <div className="bg-surface border border-border-default rounded-xl p-4">
          <div className="text-xs text-secondary font-medium flex items-center justify-between">
            <span>Contracts Awarded</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400 mt-2">{awardedRfqsCount}</div>
          <div className="text-[11px] text-muted mt-0.5">L1 quotation selected</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3">
        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border-default">
          <button
            onClick={() => setTab('all')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0',
              tab === 'all'
                ? 'bg-brand text-white font-semibold'
                : 'text-secondary hover:text-primary hover:bg-surface-2'
            )}
          >
            All RFQs ({rawRfqs.length})
          </button>
          <button
            onClick={() => setTab('ready')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5',
              tab === 'ready'
                ? 'bg-brand text-white font-semibold'
                : 'text-secondary hover:text-primary hover:bg-surface-2'
            )}
          >
            Ready to Compare ({readyToCompareCount})
          </button>
          <button
            onClick={() => setTab('single')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0',
              tab === 'single'
                ? 'bg-brand text-white font-semibold'
                : 'text-secondary hover:text-primary hover:bg-surface-2'
            )}
          >
            Single Proposal ({rfqsWithQuotesCount - readyToCompareCount})
          </button>
          <button
            onClick={() => setTab('awarded')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0',
              tab === 'awarded'
                ? 'bg-brand text-white font-semibold'
                : 'text-secondary hover:text-primary hover:bg-surface-2'
            )}
          >
            Awarded ({awardedRfqsCount})
          </button>
          <button
            onClick={() => setTab('zero')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0',
              tab === 'zero'
                ? 'bg-brand text-white font-semibold'
                : 'text-secondary hover:text-primary hover:bg-surface-2'
            )}
          >
            Awaiting Proposals ({rawRfqs.length - rfqsWithQuotesCount})
          </button>
        </div>

        {/* Search & Category */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search proposals by RFQ code or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface border border-border-default rounded-lg text-sm text-primary placeholder:text-muted focus:outline-none focus:border-brand"
            />
          </div>

          <div className="w-full sm:w-56 shrink-0">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border-default rounded-lg text-sm text-primary focus:outline-none focus:border-brand"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm">
        {isLoadingStaff ? (
          <div className="p-8 text-center text-sm text-muted">Loading vendor quotations...</div>
        ) : filteredRfqs.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Layers}
              title="No quotations matching criteria"
              description="No procurement proposals found matching the selected filter tab or search keywords."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-secondary text-xs uppercase tracking-wider border-b border-border-default">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">RFQ Code</th>
                  <th className="px-5 py-3.5 font-semibold">Title & Category</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Submission Deadline</th>
                  <th className="px-5 py-3.5 font-semibold">Bids Received</th>
                  <th className="px-5 py-3.5 font-semibold">Lowest Quoted Bid (L1)</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {filteredRfqs.map((rfq: any) => {
                  const submittedQuotes = (rfq.quotations || []).filter(
                    (q: any) => q.status === 'SUBMITTED' || q.status === 'ACCEPTED'
                  );
                  const quotesCount =
                    rfq.quotesCount !== undefined ? rfq.quotesCount : submittedQuotes.length;
                  const hasQuotes = quotesCount > 0 || submittedQuotes.length > 0;
                  const isDeadlinePassed = new Date(rfq.deadline).getTime() <= Date.now();

                  const minTotal =
                    submittedQuotes.length > 0
                      ? Math.min(...submittedQuotes.map((q: any) => Number(q.grandTotal)))
                      : null;

                  return (
                    <tr key={rfq.id} className="hover:bg-surface-2/40 transition-colors group">
                      <td className="px-5 py-4 font-mono font-medium text-brand text-xs">
                        <Link to={`/rfqs/${rfq.id}`} className="hover:underline flex items-center gap-1">
                          {rfq.code}
                        </Link>
                      </td>

                      <td className="px-5 py-4 max-w-xs">
                        <div className="font-medium text-primary line-clamp-1">{rfq.title}</div>
                        <div className="text-xs text-secondary mt-0.5">
                          {rfq.category} · {rfq.itemsCount || rfq.items?.length || 0} items
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={rfq.effectiveStatus || rfq.status} />
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

                      <td className="px-5 py-4 text-xs">
                        {hasQuotes ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {quotesCount} {quotesCount === 1 ? 'Proposal' : 'Proposals'}
                          </span>
                        ) : (
                          <span className="text-muted italic">0 proposals</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs">
                        {minTotal !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-emerald-400">
                              ₹{minTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              L1
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasQuotes ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => navigate(`/rfqs/${rfq.id}/comparison`)}
                              className="text-xs py-1 px-3 gap-1.5 shadow-sm"
                              title="Open Quotation Comparison Matrix (Screen 7)"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              Compare Matrix
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/rfqs/${rfq.id}`)}
                              className="text-xs py-1 px-3 gap-1.5 text-secondary hover:text-primary"
                              title="View RFQ details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View RFQ
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
        )}
      </div>
    </div>
  );
}

export default QuotationsHubPage;
