import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Layers,
  Building2,
  Clock,
  Edit2,
  Send,
  XCircle,
  RotateCcw,
  CheckCircle2,
  Star,
  FileText,
  User,
  AlertTriangle,
} from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

export function RfqDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [newDeadline, setNewDeadline] = useState('');

  const { data: rfq, isLoading, error } = useQuery({
    queryKey: ['rfq', id],
    queryFn: async () => {
      const res = await api.get(`/rfqs/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      return (await api.post(`/rfqs/${id}/publish`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfq', id] });
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      success('RFQ published successfully! Assigned vendors can now submit bids.');
    },
    onError: (err) => {
      toastError(getErrorMessage(err));
    },
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      return (await api.post(`/rfqs/${id}/close`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfq', id] });
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      success('RFQ closed successfully.');
    },
    onError: (err) => {
      toastError(getErrorMessage(err));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return (
        await api.post(`/rfqs/${id}/cancel`, {
          reason: cancelReason.trim(),
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfq', id] });
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      success('RFQ has been cancelled.');
      setIsCancelModalOpen(false);
      setCancelReason('');
    },
    onError: (err) => {
      toastError(getErrorMessage(err));
    },
  });

  const reopenMutation = useMutation({
    mutationFn: async () => {
      return (
        await api.post(`/rfqs/${id}/reopen`, {
          deadline: new Date(newDeadline).toISOString(),
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfq', id] });
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      success('RFQ reopened with extended deadline.');
      setIsReopenModalOpen(false);
      setNewDeadline('');
    },
    onError: (err) => {
      toastError(getErrorMessage(err));
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center text-sm text-secondary">
        Loading RFQ details...
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className="max-w-md mx-auto p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-primary">RFQ Not Found</h2>
        <p className="text-sm text-secondary">
          The requested RFQ could not be found or you do not have permission to view it.
        </p>
        <Button variant="outline" onClick={() => navigate('/rfqs')}>
          Back to RFQ List
        </Button>
      </div>
    );
  }

  const isDeadlinePassed = new Date(rfq.deadline).getTime() <= Date.now();
  const hasSubmittedQuotes = (rfq.vendors || []).some(
    (v: any) => v.quotation && v.quotation.status === 'SUBMITTED'
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header with Navigation and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-5">
        <div className="flex items-center gap-3">
          <Link
            to="/rfqs"
            className="p-2 rounded-lg border border-border-default bg-surface hover:bg-surface-2 transition-colors text-secondary hover:text-primary"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm font-semibold px-2.5 py-0.5 rounded bg-brand/10 text-brand">
                {rfq.code}
              </span>
              <StatusBadge status={rfq.effectiveStatus} />
            </div>
            <h1 className="text-2xl font-bold text-primary mt-1">{rfq.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasSubmittedQuotes && (
            <Button
              variant="primary"
              onClick={() => navigate(`/rfqs/${rfq.id}/comparison`)}
              className="gap-2 shadow-sm"
            >
              <Layers className="w-4 h-4" />
              Compare Quotes (Screen 7)
            </Button>
          )}

          {rfq.status === 'DRAFT' && (
            <>
              <Button
                variant="outline"
                onClick={() => navigate(`/rfqs/${rfq.id}/edit`)}
                className="gap-1.5"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </Button>
              <Button
                variant="primary"
                onClick={() => publishMutation.mutate()}
                isLoading={publishMutation.isPending}
                className="gap-1.5"
              >
                <Send className="w-4 h-4" />
                Publish RFQ
              </Button>
            </>
          )}

          {rfq.status === 'OPEN' && (
            <Button
              variant="outline"
              onClick={() => closeMutation.mutate()}
              isLoading={closeMutation.isPending}
              className="gap-1.5 text-amber-400 border-amber-500/30 hover:bg-amber-950/20"
            >
              <Clock className="w-4 h-4" />
              Close Submissions
            </Button>
          )}

          {rfq.status === 'CLOSED' && (
            <Button
              variant="outline"
              onClick={() => {
                const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                setNewDeadline(d.toISOString().slice(0, 16));
                setIsReopenModalOpen(true);
              }}
              className="gap-1.5 text-blue-400 border-blue-500/30 hover:bg-blue-950/20"
            >
              <RotateCcw className="w-4 h-4" />
              Reopen RFQ
            </Button>
          )}

          {(rfq.status === 'DRAFT' || rfq.status === 'OPEN' || rfq.status === 'CLOSED') && (
            <Button
              variant="ghost"
              onClick={() => setIsCancelModalOpen(true)}
              className="gap-1.5 text-secondary hover:text-status-danger"
            >
              <XCircle className="w-4 h-4" />
              Cancel RFQ
            </Button>
          )}
        </div>
      </div>

      {/* RFQ Meta Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border-default space-y-1">
          <span className="text-xs text-secondary flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Category
          </span>
          <p className="text-sm font-semibold text-primary">{rfq.category}</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border-default space-y-1">
          <span className="text-xs text-secondary flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Submission Deadline
          </span>
          <p
            className={cn(
              'text-sm font-semibold',
              isDeadlinePassed && rfq.status === 'OPEN'
                ? 'text-status-danger'
                : 'text-primary'
            )}
          >
            {new Date(rfq.deadline).toLocaleDateString()} at{' '}
            {new Date(rfq.deadline).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border-default space-y-1">
          <span className="text-xs text-secondary flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Created By
          </span>
          <p className="text-sm font-semibold text-primary">
            {rfq.createdBy
              ? `${rfq.createdBy.firstName} ${rfq.createdBy.lastName}`
              : 'Procurement Officer'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border-default space-y-1">
          <span className="text-xs text-secondary flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Invited Vendors
          </span>
          <p className="text-sm font-semibold text-primary">
            {(rfq.vendors || []).length} Vendors Assigned
          </p>
        </div>
      </div>

      {/* Description / Scope */}
      {rfq.description && (
        <div className="p-5 rounded-xl bg-surface border border-border-default space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary">
            Scope & Procurement Notes
          </h3>
          <p className="text-sm text-primary leading-relaxed whitespace-pre-wrap">
            {rfq.description}
          </p>
        </div>
      )}

      {/* Section 1: Line Items Table */}
      <div className="bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border-default flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-primary">Required Line Items</h2>
            <p className="text-xs text-secondary">
              Total of {(rfq.items || []).length} products/services requested in this quotation round.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2/60 text-secondary border-b border-border-default text-xs uppercase font-medium">
              <tr>
                <th className="px-6 py-3.5 w-16">#</th>
                <th className="px-6 py-3.5">Item Name & Specs</th>
                <th className="px-6 py-3.5 text-right">Required Quantity</th>
                <th className="px-6 py-3.5 text-right">Unit of Measure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {(rfq.items || []).map((item: any, index: number) => (
                <tr key={item.id} className="hover:bg-surface-2/30 transition-colors">
                  <td className="px-6 py-4 text-xs font-mono text-secondary">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-primary">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-secondary mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-primary">
                    {Number(item.quantity).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-secondary">
                    {item.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Assigned Vendors & Quotation Statuses */}
      <div className="bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border-default flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-primary">Assigned Vendors & Quotes</h2>
            <p className="text-xs text-secondary">
              Status of invited vendors and their submitted quotation packages.
            </p>
          </div>
          {hasSubmittedQuotes && (
            <Link
              to={`/rfqs/${rfq.id}/comparison`}
              className="text-xs font-medium text-brand hover:underline flex items-center gap-1"
            >
              Open Side-by-Side Comparison Matrix →
            </Link>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2/60 text-secondary border-b border-border-default text-xs uppercase font-medium">
              <tr>
                <th className="px-6 py-3.5">Vendor Name</th>
                <th className="px-6 py-3.5">Category & Rating</th>
                <th className="px-6 py-3.5">Contact</th>
                <th className="px-6 py-3.5">Invited / Viewed</th>
                <th className="px-6 py-3.5 text-right">Quote Status</th>
                <th className="px-6 py-3.5 text-right">Grand Total (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {(rfq.vendors || []).map((rv: any) => {
                const v = rv.vendor;
                const q = rv.quotation;
                const isSelectedQuote = rfq.selectedQuotationId === q?.id;

                return (
                  <tr
                    key={v.id}
                    className={cn(
                      'hover:bg-surface-2/30 transition-colors',
                      isSelectedQuote && 'bg-emerald-950/20'
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-primary">{v.name}</span>
                        {isSelectedQuote && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30">
                            Selected Winner
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs text-secondary">
                      <div>{v.category}</div>
                      {v.rating && (
                        <div className="flex items-center gap-1 text-amber-400 font-medium mt-0.5">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{v.rating}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs text-secondary">
                      <div>{v.contactName}</div>
                      <div className="text-muted text-[11px]">{v.contactEmail}</div>
                    </td>

                    <td className="px-6 py-4 text-xs text-secondary">
                      <div>
                        Invited: {new Date(rv.invitedAt).toLocaleDateString()}
                      </div>
                      <div className="text-muted text-[11px]">
                        {rv.viewedAt
                          ? `Viewed: ${new Date(rv.viewedAt).toLocaleDateString()}`
                          : 'Not viewed yet'}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      {q ? (
                        <StatusBadge status={q.status} />
                      ) : (
                        <span className="text-xs text-amber-400 font-medium">
                          Awaiting Quote
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right font-mono font-medium text-sm">
                      {q && q.status === 'SUBMITTED' ? (
                        <span className="text-emerald-400">
                          ₹{Number(q.grandTotal).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-muted text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Modal */}
      {isCancelModalOpen && (
        <Modal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          title={`Cancel RFQ: ${rfq.code}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-secondary">
              Provide a reason for cancellation. Assigned vendors will be notified.
            </p>
            <Textarea
              label="Cancellation Reason"
              placeholder="e.g. Specification revised, budget postponed..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              required
            />
            <div className="flex justify-end gap-3 pt-3">
              <Button variant="ghost" onClick={() => setIsCancelModalOpen(false)}>
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

      {/* Reopen Modal */}
      {isReopenModalOpen && (
        <Modal
          isOpen={isReopenModalOpen}
          onClose={() => setIsReopenModalOpen(false)}
          title={`Reopen RFQ: ${rfq.code}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-secondary">
              Select a new deadline in the future to reopen quotation submissions.
            </p>
            <Input
              label="New Future Submission Deadline"
              type="datetime-local"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              required
            />
            <div className="flex justify-end gap-3 pt-3">
              <Button variant="ghost" onClick={() => setIsReopenModalOpen(false)}>
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
