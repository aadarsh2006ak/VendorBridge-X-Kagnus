import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  Layers,
  Save,
  Send,
  AlertCircle,
  CheckCircle2,
  Lock,
  History,
  FileText,
  IndianRupee,
} from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

interface LineQuote {
  rfqItemId: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number | '';
  deliveryDays: number | '';
}

export function VendorQuotePage() {
  const { id: rfqId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [lineQuotes, setLineQuotes] = useState<LineQuote[]>([]);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [paymentTermsDays, setPaymentTermsDays] = useState<number | ''>(30);
  const [notes, setNotes] = useState('');
  const [version, setVersion] = useState<number | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch RFQ and current quote
  const { data: rfqData, isLoading, error } = useQuery({
    queryKey: ['vendor-rfq', rfqId],
    queryFn: async () => {
      const res = await api.get(`/vendor-portal/rfqs/${rfqId}`);
      return res.data.data;
    },
    enabled: Boolean(rfqId),
  });

  useEffect(() => {
    if (rfqData) {
      const existingQuote = rfqData.quotation;
      const quoteItemMap = new Map(
        (existingQuote?.items || []).map((qi: any) => [qi.rfqItemId, qi])
      );

      const mappedLines: LineQuote[] = (rfqData.items || []).map((item: any) => {
        const quoted = quoteItemMap.get(item.id) as any;
        return {
          rfqItemId: item.id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: quoted ? quoted.unitPrice : '',
          deliveryDays: quoted ? quoted.deliveryDays : 7,
        };
      });

      setLineQuotes(mappedLines);

      if (existingQuote) {
        setTaxRate(existingQuote.taxRate ?? 18);
        setPaymentTermsDays(existingQuote.paymentTermsDays ?? 30);
        setNotes(existingQuote.notes || '');
        setVersion(existingQuote.version);
      }
    }
  }, [rfqData]);

  // Live Financial Calculations (BR-7)
  const totals = useMemo(() => {
    let subtotal = 0;
    let maxDelivery = 0;

    for (const line of lineQuotes) {
      const price = Number(line.unitPrice) || 0;
      const days = Number(line.deliveryDays) || 0;
      const lineTotal = line.quantity * price;
      subtotal += lineTotal;
      if (days > maxDelivery) {
        maxDelivery = days;
      }
    }

    const effectiveTaxRate = Number(taxRate) || 0;
    const taxAmount = (subtotal * effectiveTaxRate) / 100;
    const grandTotal = subtotal + taxAmount;

    return {
      subtotal,
      taxAmount,
      grandTotal,
      maxDelivery,
    };
  }, [lineQuotes, taxRate]);

  const handlePriceChange = (rfqItemId: string, val: string) => {
    const num = val === '' ? '' : parseFloat(val);
    setLineQuotes((prev) =>
      prev.map((l) => (l.rfqItemId === rfqItemId ? { ...l, unitPrice: num } : l))
    );
  };

  const handleDeliveryChange = (rfqItemId: string, val: string) => {
    const num = val === '' ? '' : parseInt(val, 10);
    setLineQuotes((prev) =>
      prev.map((l) => (l.rfqItemId === rfqItemId ? { ...l, deliveryDays: num } : l))
    );
  };

  const isDeadlinePassed = rfqData ? new Date(rfqData.deadline).getTime() <= Date.now() : false;
  const isLocked = rfqData ? rfqData.status !== 'OPEN' || isDeadlinePassed : false;

  const validate = (submit: boolean) => {
    const errs: Record<string, string> = {};

    if (submit) {
      for (const line of lineQuotes) {
        if (!line.unitPrice || Number(line.unitPrice) <= 0) {
          errs[`price_${line.rfqItemId}`] = 'Unit price required (> 0)';
        }
        if (line.deliveryDays === '' || Number(line.deliveryDays) < 0) {
          errs[`days_${line.rfqItemId}`] = 'Delivery days required';
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitMutation = useMutation({
    mutationFn: async ({ submit }: { submit: boolean }) => {
      const payload = {
        items: lineQuotes
          .filter((l) => l.unitPrice !== '')
          .map((l) => ({
            rfqItemId: l.rfqItemId,
            unitPrice: Number(l.unitPrice),
            deliveryDays: Number(l.deliveryDays) || 0,
          })),
        taxRate: Number(taxRate) || 18,
        deliveryDays: totals.maxDelivery,
        paymentTermsDays: paymentTermsDays === '' ? undefined : Number(paymentTermsDays),
        notes: notes.trim() || undefined,
        submit,
        version,
      };

      return (await api.put(`/vendor-portal/rfqs/${rfqId}/quotation`, payload)).data;
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-rfq', rfqId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-portal', 'rfqs'] });
      success(
        vars.submit
          ? 'Quotation submitted successfully! Procurement has received your bid.'
          : 'Quotation saved as draft.'
      );
      if (vars.submit) {
        navigate('/rfqs');
      }
    },
    onError: (err) => {
      toastError(getErrorMessage(err));
    },
  });

  const handleAction = (submit: boolean) => {
    if (validate(submit)) {
      submitMutation.mutate({ submit });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-sm text-secondary">
        Loading quotation submission workspace...
      </div>
    );
  }

  if (error || !rfqData) {
    return (
      <div className="max-w-md mx-auto p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-primary">RFQ Not Found</h2>
        <p className="text-sm text-secondary">
          You are either not assigned to this RFQ or it does not exist.
        </p>
        <Button variant="outline" onClick={() => navigate('/rfqs')}>
          Back to Assigned RFQs
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-5">
        <div className="flex items-center gap-3">
          <Link
            to="/rfqs"
            className="p-2 rounded-lg border border-border-default bg-surface hover:bg-surface-2 transition-colors text-secondary hover:text-primary"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-brand/10 text-brand">
                {rfqData.code}
              </span>
              <StatusBadge status={rfqData.effectiveStatus} />
              {rfqData.quotation && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                  {rfqData.quotation.status === 'SUBMITTED' ? 'Quote Submitted' : 'Draft Quote'}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-primary mt-1">Submit Quotations</h1>
            <p className="text-sm text-secondary mt-0.5">
              RFQ: {rfqData.title} — deadline {new Date(rfqData.deadline).toLocaleDateString()}
            </p>
          </div>
        </div>

        {!isLocked && (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAction(false)}
              isLoading={submitMutation.isPending && !submitMutation.variables?.submit}
              disabled={submitMutation.isPending}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => handleAction(true)}
              isLoading={submitMutation.isPending && submitMutation.variables?.submit}
              disabled={submitMutation.isPending}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              Submit Quotation
            </Button>
          </div>
        )}
      </div>

      {/* Deadline Notice Banner */}
      {isLocked ? (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 flex items-start gap-3">
          <Lock className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
          <div className="text-sm">
            <span className="font-semibold block text-amber-200">
              Quotation Submission Closed (Read-Only)
            </span>
            The deadline for this RFQ passed on{' '}
            {new Date(rfqData.deadline).toLocaleDateString()} at{' '}
            {new Date(rfqData.deadline).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
            . Further modifications are locked per procurement rules (BR-4).
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 text-blue-300 flex items-start gap-3">
          <Clock className="w-5 h-5 shrink-0 mt-0.5 text-blue-400" />
          <div className="text-sm">
            <span className="font-semibold block text-blue-200">
              Submission Deadline: {new Date(rfqData.deadline).toLocaleDateString()} at{' '}
              {new Date(rfqData.deadline).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            You may edit and resubmit your quotation at any time before this deadline.
          </div>
        </div>
      )}

      {/* Screen 6 Mockup: RFQ Summary Box */}
      <div className="p-3.5 rounded-xl bg-surface border border-border-default flex items-center justify-between text-xs">
        <div>
          <span className="font-semibold text-secondary uppercase text-[10px] tracking-wider block">
            RFQ Requirements Summary
          </span>
          <span className="text-primary font-medium mt-0.5 block">
            {(rfqData.items || []).map((i: any) => `${i.name} * ${i.quantity}`).join(', ')} — category: {rfqData.category}
          </span>
        </div>
      </div>

      {/* Scope / Notes if present */}
      {rfqData.description && (
        <div className="p-4 rounded-xl bg-surface border border-border-default space-y-1">
          <span className="text-xs font-semibold uppercase text-secondary">
            Scope & Instructions from Procurement
          </span>
          <p className="text-sm text-primary leading-relaxed whitespace-pre-wrap">
            {rfqData.description}
          </p>
        </div>
      )}

      {/* Line Items Pricing Table */}
      <div className="bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border-default">
          <h2 className="text-base font-semibold text-primary">Line Items Pricing (INR)</h2>
          <p className="text-xs text-secondary">
            Enter your competitive unit price and delivery timeline for each requested item.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2/60 text-secondary border-b border-border-default text-xs uppercase font-medium">
              <tr>
                <th className="px-6 py-3.5">Item & Specs</th>
                <th className="px-6 py-3.5 text-right w-28">Quantity</th>
                <th className="px-6 py-3.5 w-44">Unit Price (₹)</th>
                <th className="px-6 py-3.5 w-36">Delivery (Days)</th>
                <th className="px-6 py-3.5 text-right w-44">Line Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {lineQuotes.map((item) => {
                const lineTotal =
                  item.unitPrice !== '' ? item.quantity * Number(item.unitPrice) : 0;
                const priceError = errors[`price_${item.rfqItemId}`];
                const daysError = errors[`days_${item.rfqItemId}`];

                return (
                  <tr key={item.rfqItemId} className="hover:bg-surface-2/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-primary">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-secondary mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right font-medium text-primary">
                      {item.quantity} <span className="text-xs text-secondary">{item.unit}</span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          disabled={isLocked}
                          placeholder="0.00"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handlePriceChange(item.rfqItemId, e.target.value)
                          }
                          className={cn(
                            'w-full pl-7 pr-3 py-1.5 bg-surface-2 border rounded-lg text-sm text-primary placeholder:text-muted focus:outline-none font-mono',
                            priceError
                              ? 'border-status-danger'
                              : 'border-border-default focus:border-brand',
                            isLocked && 'opacity-60 cursor-not-allowed'
                          )}
                        />
                      </div>
                      {priceError && (
                        <span className="text-[11px] text-status-danger mt-1 block">
                          {priceError}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min="0"
                        disabled={isLocked}
                        placeholder="e.g. 7"
                        value={item.deliveryDays}
                        onChange={(e) =>
                          handleDeliveryChange(item.rfqItemId, e.target.value)
                        }
                        className={cn(
                          'w-full px-3 py-1.5 bg-surface-2 border rounded-lg text-sm text-primary placeholder:text-muted focus:outline-none font-mono',
                          daysError
                            ? 'border-status-danger'
                            : 'border-border-default focus:border-brand',
                          isLocked && 'opacity-60 cursor-not-allowed'
                        )}
                      />
                      {daysError && (
                        <span className="text-[11px] text-status-danger mt-1 block">
                          {daysError}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right font-mono font-medium text-primary">
                      ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Summary & Commercial Terms */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Commercial Terms & Notes */}
        <div className="md:col-span-7 space-y-5 bg-surface p-6 rounded-xl border border-border-default shadow-sm">
          <h3 className="text-sm font-semibold text-primary">Commercial Terms & Warranty</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="GST Tax Rate (%)"
                type="number"
                min="0"
                max="100"
                step="any"
                value={taxRate}
                disabled={isLocked}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
            <div>
              <Input
                label="Payment Terms (Days)"
                type="number"
                min="0"
                max="365"
                value={paymentTermsDays}
                disabled={isLocked}
                onChange={(e) =>
                  setPaymentTermsDays(
                    e.target.value === '' ? '' : parseInt(e.target.value, 10)
                  )
                }
                helperText="e.g. 30 days net from invoice"
              />
            </div>
          </div>

          <div>
            <Textarea
              label="Vendor Quotation Notes & Validity"
              placeholder="Specify warranty coverage, OEM authorization, validity period (e.g. 30 days), and delivery logistics terms..."
              value={notes}
              disabled={isLocked}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        {/* Live Calculation Box (BR-7) */}
        <div className="md:col-span-5 bg-surface p-6 rounded-xl border border-border-default shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-primary border-b border-border-default pb-3">
              Quotation Summary
            </h3>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between text-secondary">
                <span>Items Subtotal:</span>
                <span className="font-mono text-primary">
                  ₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between text-secondary">
                <span>Tax Rate (GST {taxRate}%):</span>
                <span className="font-mono text-primary">
                  ₹{totals.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between text-secondary">
                <span>Max Delivery Days:</span>
                <span className="font-mono text-primary">{totals.maxDelivery} Days</span>
              </div>

              <div className="pt-3 border-t border-border-default flex items-center justify-between">
                <span className="font-semibold text-base text-primary">Grand Total:</span>
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  ₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {!isLocked && (
            <div className="pt-6 space-y-2">
              <Button
                type="button"
                variant="primary"
                onClick={() => handleAction(true)}
                isLoading={submitMutation.isPending && submitMutation.variables?.submit}
                disabled={submitMutation.isPending}
                className="w-full gap-2 shadow-sm py-2.5 text-sm"
              >
                <Send className="w-4 h-4" />
                Submit Final Quotation
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAction(false)}
                isLoading={submitMutation.isPending && !submitMutation.variables?.submit}
                disabled={submitMutation.isPending}
                className="w-full gap-2 text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                Save Draft (Incomplete Quote)
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
