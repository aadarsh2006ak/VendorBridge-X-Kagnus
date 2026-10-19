import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Star,
  Clock,
  Layers,
  Award,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Building2,
  Calendar,
  X,
  RotateCcw,
} from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

export function RfqComparisonPage() {
  const { id: rfqId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  // Filters & Sorting state
  const [sortBy, setSortBy] = useState<'price' | 'delivery' | 'rating' | 'submittedAt'>('price');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [maxDeliveryDays, setMaxDeliveryDays] = useState<number | ''>('');
  const [minRating, setMinRating] = useState<number | ''>('');

  // Selection state
  const [quotationToSelect, setQuotationToSelect] = useState<{ id: string; vendorName: string } | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  // Fetch Comparison Matrix
  const { data: matrix, isLoading, error } = useQuery({
    queryKey: ['rfq-comparison', rfqId, { sortBy, order, maxPrice, maxDeliveryDays, minRating }],
    queryFn: async () => {
      const res = await api.get(`/rfqs/${rfqId}/comparison`, {
        params: {
          sortBy,
          order,
          maxPrice: maxPrice === '' ? undefined : Number(maxPrice),
          maxDeliveryDays: maxDeliveryDays === '' ? undefined : Number(maxDeliveryDays),
          minRating: minRating === '' ? undefined : Number(minRating),
        },
      });
      return res.data.data;
    },
    enabled: Boolean(rfqId),
  });

  // Select Quotation Mutation
  const selectMutation = useMutation({
    mutationFn: async (quotationId: string) => {
      return (
        await api.put(`/rfqs/${rfqId}/selection`, {
          quotationId,
          version: matrix.rfq.version,
        })
      ).data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rfq-comparison', rfqId] });
      queryClient.invalidateQueries({ queryKey: ['rfq', rfqId] });
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      success('Quotation selected as winning bid! RFQ updated to Quotation Selected.');
      setQuotationToSelect(null);
    },
    onError: (err) => {
      toastError(getErrorMessage(err));
    },
  });

  // Clear Selection Mutation
  const clearSelectionMutation = useMutation({
    mutationFn: async () => {
      return (
        await api.delete(`/rfqs/${rfqId}/selection`, {
          data: { version: matrix.rfq.version },
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfq-comparison', rfqId] });
      queryClient.invalidateQueries({ queryKey: ['rfq', rfqId] });
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      success('Quotation selection cleared.');
      setIsClearConfirmOpen(false);
    },
    onError: (err) => {
      toastError(getErrorMessage(err));
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center text-sm text-secondary">
        Building side-by-side quotation comparison matrix...
      </div>
    );
  }

  if (error || !matrix) {
    return (
      <div className="max-w-md mx-auto p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-primary">Comparison Unavailable</h2>
        <p className="text-sm text-secondary">
          Could not load the comparison matrix for this RFQ.
        </p>
        <Button variant="outline" onClick={() => navigate('/rfqs')}>
          Back to RFQ List
        </Button>
      </div>
    );
  }

  const { rfq, items, vendors, summary } = matrix;
  const isSelected = Boolean(rfq.selectedQuotationId);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-5">
        <div className="flex items-center gap-3">
          <Link
            to={`/rfqs/${rfq.id}`}
            className="p-2 rounded-lg border border-border-default bg-surface hover:bg-surface-2 transition-colors text-secondary hover:text-primary"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-brand/10 text-brand">
                {rfq.code}
              </span>
              <StatusBadge status={rfq.effectiveStatus} />
              {isSelected && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  Winning Bid Selected
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-primary mt-1">
              Quotation Comparison
            </h1>
            <p className="text-sm text-secondary mt-0.5">
              RFQ: {rfq.title} — {summary.totalSubmittedQuotes} {summary.totalSubmittedQuotes === 1 ? 'quotation' : 'quotations'} received
            </p>
          </div>
        </div>

        {isSelected && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsClearConfirmOpen(true)}
            className="text-xs text-secondary hover:text-rose-400 border-border-default gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear Selection
          </Button>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border-default space-y-1">
          <span className="text-xs text-secondary">Total Invited Vendors</span>
          <p className="text-xl font-bold text-primary">{summary.totalAssignedVendors}</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border-default space-y-1">
          <span className="text-xs text-secondary">Quotations Submitted</span>
          <p className="text-xl font-bold text-emerald-400">
            {summary.totalSubmittedQuotes} / {summary.totalAssignedVendors}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border-default space-y-1">
          <span className="text-xs text-secondary flex items-center gap-1 text-emerald-400">
            <Award className="w-3.5 h-3.5" />
            Lowest Grand Total (L1)
          </span>
          <p className="text-xl font-bold font-mono text-emerald-400">
            {summary.lowestGrandTotal !== null
              ? `₹${summary.lowestGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              : 'N/A'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border-default space-y-1">
          <span className="text-xs text-secondary">Fastest Delivery</span>
          <p className="text-xl font-bold text-primary">
            {summary.lowestDeliveryDays !== null ? `${summary.lowestDeliveryDays} Days` : 'N/A'}
          </p>
        </div>
      </div>

      {/* Filter and Sorting Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3.5 rounded-xl border border-border-default text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-secondary font-medium flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted" />
            Sort By:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 bg-surface-2 border border-border-default rounded-lg text-primary focus:outline-none focus:border-brand"
          >
            <option value="price">Grand Total (Lowest First)</option>
            <option value="delivery">Delivery Timeline (Fastest First)</option>
            <option value="rating">Vendor Rating (Highest First)</option>
            <option value="submittedAt">Submission Date (Latest First)</option>
          </select>

          <button
            type="button"
            onClick={() => setOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            className="px-2.5 py-1.5 rounded-lg border border-border-default bg-surface-2 text-secondary hover:text-primary transition-colors"
          >
            {order === 'asc' ? '↑ Ascending' : '↓ Descending'}
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-muted">Max ₹:</span>
            <input
              type="number"
              placeholder="e.g. 500000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-24 px-2 py-1 bg-surface-2 border border-border-default rounded text-xs text-primary focus:outline-none focus:border-brand font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted">Max Days:</span>
            <input
              type="number"
              placeholder="e.g. 15"
              value={maxDeliveryDays}
              onChange={(e) =>
                setMaxDeliveryDays(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="w-16 px-2 py-1 bg-surface-2 border border-border-default rounded text-xs text-primary focus:outline-none focus:border-brand font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted">Min ⭐:</span>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              placeholder="4.0"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-16 px-2 py-1 bg-surface-2 border border-border-default rounded text-xs text-primary focus:outline-none focus:border-brand font-mono"
            />
          </div>

          {(maxPrice !== '' || maxDeliveryDays !== '' || minRating !== '') && (
            <button
              type="button"
              onClick={() => {
                setMaxPrice('');
                setMaxDeliveryDays('');
                setMinRating('');
              }}
              className="text-brand hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Side-by-Side Comparison Matrix */}
      {vendors.length === 0 ? (
        <div className="p-12 text-center text-sm text-secondary bg-surface rounded-xl border border-border-default">
          No quotations match the active filter criteria.
        </div>
      ) : (
        <div className="border border-border-default rounded-xl bg-surface overflow-x-auto shadow-sm">
          <table className="w-full text-left border-collapse min-w-[750px]">
            {/* Header: Vendor Cards Columns */}
            <thead>
              <tr className="border-b border-border-default">
                {/* Left Fixed Column: Line Items Label */}
                <th className="p-5 w-72 bg-surface-2/40 align-top border-r border-border-default">
                  <div className="text-xs font-semibold uppercase tracking-wider text-secondary">
                    Procurement Specifications
                  </div>
                  <div className="text-sm font-bold text-primary mt-1">
                    {items.length} Required Items
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Side-by-side pricing & terms across invited vendors.
                  </p>
                </th>

                {/* Vendor Columns */}
                {vendors.map((col: any) => {
                  const v = col.vendor;
                  const q = col.quotation;
                  const isWinningSelected = rfq.selectedQuotationId === q?.id;
                  const isLowest = q?.isLowestPrice;

                  return (
                    <th
                      key={v.id}
                      className={cn(
                        'p-5 w-80 align-top border-r border-border-default transition-all relative',
                        isWinningSelected && 'bg-emerald-950/20 ring-2 ring-emerald-500 inset-0',
                        isLowest && !isWinningSelected && 'bg-emerald-950/10'
                      )}
                    >
                      {/* Lowest Price Tag / Winner Tag (BR-10) */}
                      {isWinningSelected ? (
                        <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-sm">
                          <Award className="w-3.5 h-3.5" />
                          Selected Winner
                        </div>
                      ) : isLowest ? (
                        <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40 font-semibold text-xs tracking-wider shadow-sm animate-pulse">
                          <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                          Lowest Price (L1)
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="font-bold text-base text-primary leading-tight">
                            {v.name}
                          </h3>
                          {v.rating && (
                            <span className="flex items-center gap-0.5 text-xs text-amber-400 font-semibold shrink-0">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              {v.rating}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-secondary">
                          {v.contactName} • {v.contactEmail}
                        </div>

                        {/* Grand Total Highlight */}
                        <div className="pt-2">
                          <span className="text-[11px] uppercase tracking-wider text-muted block">
                            Grand Total (Incl. Tax)
                          </span>
                          {q && q.isComparable ? (
                            <span
                              className={cn(
                                'text-2xl font-bold font-mono block mt-0.5',
                                isLowest || isWinningSelected
                                  ? 'text-emerald-400'
                                  : 'text-primary'
                              )}
                            >
                              ₹{q.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          ) : q ? (
                            <span className="text-amber-400 text-sm font-medium">
                              Draft Quote (Incomplete)
                            </span>
                          ) : (
                            <span className="text-muted text-sm italic">
                              No quote submitted
                            </span>
                          )}
                        </div>

                        {/* Select Button */}
                        {q && q.isComparable && (
                          <div className="pt-2">
                            {isWinningSelected ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsClearConfirmOpen(true)}
                                className="w-full text-xs text-secondary hover:text-rose-400"
                              >
                                Clear Selection
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant={isLowest ? 'primary' : 'outline'}
                                onClick={() =>
                                  setQuotationToSelect({ id: q.id, vendorName: v.name })
                                }
                                className={cn(
                                  'w-full text-xs gap-1.5 font-semibold',
                                  isLowest && 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                                )}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {isLowest ? 'Select & Approve' : 'Select'}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Matrix Body: Per Line Item Rows */}
            <tbody className="divide-y divide-border-default text-xs">
              {/* Row for Timeline & Terms */}
              <tr className="bg-surface-2/30 font-semibold">
                <td className="p-4 text-secondary uppercase tracking-wider border-r border-border-default">
                  Commercial Terms
                </td>
                {vendors.map((col: any) => {
                  const q = col.quotation;
                  return (
                    <td
                      key={col.vendor.id}
                      className="p-4 border-r border-border-default font-normal space-y-1 text-secondary"
                    >
                      {q ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span>Delivery:</span>
                            <span className="font-medium text-primary">
                              {q.deliveryDays ? `${q.deliveryDays} Days` : 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>GST Rate:</span>
                            <span className="font-medium text-primary">{q.taxRate}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Payment Terms:</span>
                            <span className="font-medium text-primary">
                              {q.paymentTermsDays ? `${q.paymentTermsDays} Days` : 'Standard'}
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-muted italic">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Rows for Line Items */}
              {items.map((item: any, idx: number) => (
                <tr key={item.id} className="hover:bg-surface-2/20 transition-colors">
                  {/* Left Column: Item Details */}
                  <td className="p-4 border-r border-border-default align-top">
                    <div className="font-medium text-primary text-sm">{item.name}</div>
                    {item.description && (
                      <div className="text-muted text-[11px] mt-0.5">{item.description}</div>
                    )}
                    <div className="text-secondary mt-1 font-mono">
                      Qty: {item.quantity} {item.unit}
                    </div>
                  </td>

                  {/* Vendor Columns: Item Price and Line Total */}
                  {vendors.map((col: any) => {
                    const q = col.quotation;
                    const quotedItem = q?.items.find((qi: any) => qi.rfqItemId === item.id);
                    const isLowestUnit = quotedItem?.isLowestUnitPrice;

                    return (
                      <td
                        key={col.vendor.id}
                        className={cn(
                          'p-4 border-r border-border-default align-top',
                          isLowestUnit && 'bg-emerald-950/10'
                        )}
                      >
                        {quotedItem ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-secondary">Unit Price:</span>
                              <span
                                className={cn(
                                  'font-mono font-medium text-sm',
                                  isLowestUnit ? 'text-emerald-400 font-bold' : 'text-primary'
                                )}
                              >
                                ₹{quotedItem.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                {isLowestUnit && (
                                  <span className="ml-1 text-[10px] text-emerald-400 font-bold">
                                    ★
                                  </span>
                                )}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-secondary">
                              <span>Delivery:</span>
                              <span>{quotedItem.deliveryDays} Days</span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-border-default/50 font-mono text-secondary">
                              <span>Line Total:</span>
                              <span className="text-primary font-medium">
                                ₹{quotedItem.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted italic">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Vendor Notes Row */}
              <tr className="bg-surface-2/20">
                <td className="p-4 text-secondary uppercase font-semibold border-r border-border-default">
                  Vendor Notes & Warranty
                </td>
                {vendors.map((col: any) => {
                  const q = col.quotation;
                  return (
                    <td
                      key={col.vendor.id}
                      className="p-4 border-r border-border-default text-xs text-secondary leading-relaxed"
                    >
                      {q?.notes ? (
                        <p className="whitespace-pre-wrap">{q.notes}</p>
                      ) : (
                        <span className="text-muted italic">No notes provided</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>

          {/* Screen 7 Mockup: Footnote */}
          <div className="p-3.5 border-t border-border-default bg-surface-2/30 text-xs text-rose-400 font-medium italic">
            * Green = lowest price. Selecting vendor initiates the approval workflow.
          </div>
        </div>
      )}

      {/* Confirm Select Dialog */}
      <ConfirmDialog
        isOpen={Boolean(quotationToSelect)}
        title="Select Winning Quotation"
        description={`Are you sure you want to select the quotation from ${quotationToSelect?.vendorName}? This will advance the RFQ to 'Quotation Selected' status.`}
        confirmLabel="Confirm Selection"
        onConfirm={() => {
          if (quotationToSelect) {
            selectMutation.mutate(quotationToSelect.id);
          }
        }}
        onClose={() => setQuotationToSelect(null)}
        isLoading={selectMutation.isPending}
      />

      {/* Confirm Clear Selection Dialog */}
      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        title="Clear Selected Quotation"
        description="Are you sure you want to clear the selected quotation? The RFQ will revert to its previous status."
        confirmLabel="Clear Selection"
        isDestructive={true}
        onConfirm={() => clearSelectionMutation.mutate()}
        onClose={() => setIsClearConfirmOpen(false)}
        isLoading={clearSelectionMutation.isPending}
      />
    </div>
  );
}
