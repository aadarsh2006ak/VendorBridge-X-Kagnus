import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import {
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  Star,
  FileText,
  Building2,
  Calendar,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react';

export function ApprovalWorkflowPage() {
  const { id, rfqId } = useParams<{ id?: string; rfqId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [remarks, setRemarks] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');

  // Fetch Approval Request by ID or RFQ ID
  const { data: approval, isLoading, error } = useQuery({
    queryKey: ['approval', id, rfqId],
    queryFn: async () => {
      const endpoint = rfqId ? `/approvals/by-rfq/${rfqId}` : `/approvals/${id}`;
      const res = await api.get(endpoint);
      return res.data?.data || res.data;
    },
    enabled: Boolean(id || rfqId),
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async (remarksText?: string) => {
      const targetId = approval?.id || id;
      return (await api.post(`/approvals/${targetId}/approve`, { remarks: remarksText })).data;
    },
    onSuccess: (data) => {
      const targetId = approval?.id || id;
      queryClient.invalidateQueries({ queryKey: ['approval', targetId] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      success('Procurement request approved! Purchase Order generated automatically.');
      const poId = data?.purchaseOrder?.id || data?.data?.purchaseOrder?.id;
      if (poId) {
        navigate(`/purchase-orders/${poId}`);
      }
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || 'Failed to approve request.');
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async (remarksText: string) => {
      const targetId = approval?.id || id;
      return (await api.post(`/approvals/${targetId}/reject`, { remarks: remarksText })).data;
    },
    onSuccess: () => {
      const targetId = approval?.id || id;
      queryClient.invalidateQueries({ queryKey: ['approval', targetId] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      success('Procurement request has been rejected.');
      setIsRejectModalOpen(false);
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || 'Failed to reject request.');
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center text-sm text-secondary">
        Loading approval workflow details...
      </div>
    );
  }

  if (error || !approval) {
    return (
      <div className="max-w-md mx-auto p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-primary">Approval Not Found</h2>
        <p className="text-sm text-secondary">
          Could not find the requested approval workflow record.
        </p>
        <Button variant="outline" onClick={() => navigate('/approvals')}>
          Back to Approvals
        </Button>
      </div>
    );
  }

  const isPending = approval.status === 'PENDING';
  const isApproved = approval.status === 'APPROVED';
  const isRejected = approval.status === 'REJECTED';
  const canDecide = user?.role === 'MANAGER' || user?.role === 'ADMIN';

  // Format currency INR
  const formatMoney = (val: number) => {
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Back Link */}
      <div className="flex items-center gap-2">
        <Link
          to="/approvals"
          className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Approvals
        </Link>
      </div>

      {/* Screen 8 Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Approval Workflow</h1>
        <p className="text-sm text-secondary mt-1">
          RFQ: <span className="text-primary font-medium">{approval.rfq.title}</span> — Vendor:{' '}
          <span className="text-primary font-medium">{approval.quotation.vendor.name}</span> —{' '}
          <span className="text-emerald-400 font-semibold">{formatMoney(approval.quotation.grandTotal)}</span>
        </p>
      </div>

      {/* 4-Step Stepper (Screen 8) */}
      <div className="bg-surface border border-border-default rounded-xl p-6">
        <div className="relative flex items-center justify-between">
          {/* Connector Line */}
          <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-0.5 bg-border-default -z-0" />

          {/* Step 1: Submitted */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-surface-2 border-2 border-success text-success flex items-center justify-center font-bold text-sm shadow-md">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-primary mt-2">Submitted</span>
            <span className="text-[11px] text-muted">Step 1</span>
          </div>

          {/* Step 2: L1 Review */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-surface-2 border-2 border-success text-success flex items-center justify-center font-bold text-sm shadow-md">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-primary mt-2">L1 Review</span>
            <span className="text-[11px] text-muted">Step 2</span>
          </div>

          {/* Step 3: L2 approval (Active in wireframe) */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-colors ${
                isApproved
                  ? 'bg-surface-2 border-2 border-success text-success'
                  : isRejected
                    ? 'bg-surface-2 border-2 border-danger text-danger'
                    : 'bg-surface-2 border-2 border-info text-info ring-4 ring-info/20'
              }`}
            >
              {isApproved ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : isRejected ? (
                <XCircle className="w-5 h-5" />
              ) : (
                '3'
              )}
            </div>
            <span
              className={`text-xs font-semibold mt-2 ${
                isApproved ? 'text-success' : isRejected ? 'text-danger' : 'text-info'
              }`}
            >
              L2 approval
            </span>
            <span className="text-[11px] text-muted">Step 3</span>
          </div>

          {/* Step 4: Generate PO */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-colors ${
                isApproved
                  ? 'bg-surface-2 border-2 border-success text-success'
                  : 'bg-surface border-2 border-border-default text-muted'
              }`}
            >
              {isApproved ? <CheckCircle2 className="w-5 h-5" /> : '4'}
            </div>
            <span className={`text-xs font-semibold mt-2 ${isApproved ? 'text-success' : 'text-muted'}`}>
              Generate PO
            </span>
            <span className="text-[11px] text-muted">Step 4</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid (Screen 8 Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: APPROVAL CHAIN & Remarks (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Approval Chain Section */}
          <div className="bg-surface border border-border-default rounded-xl p-6 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">Approval Chain</h3>

            <div className="space-y-4">
              {approval.timeline.map((step: any, index: number) => {
                const isStepComplete = step.status === 'APPROVED' || step.status === 'COMPLETED';
                const isStepAwaiting = step.status === 'AWAITING' || (step.status === 'PENDING' && isPending);
                const isStepRejected = step.status === 'REJECTED';

                return (
                  <div
                    key={step.id || index}
                    className="flex items-start gap-4 p-3.5 rounded-lg bg-surface-2 border border-border-default/60"
                  >
                    <div className="mt-0.5">
                      {isStepComplete ? (
                        <div className="w-7 h-7 rounded-full bg-emerald-950/60 border border-emerald-500 text-emerald-400 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : isStepRejected ? (
                        <div className="w-7 h-7 rounded-full bg-red-950/60 border border-red-500 text-red-400 flex items-center justify-center">
                          <XCircle className="w-4 h-4" />
                        </div>
                      ) : isStepAwaiting ? (
                        <div className="w-7 h-7 rounded-full bg-blue-950/60 border border-blue-400 text-blue-400 flex items-center justify-center animate-pulse">
                          <Clock className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-surface border border-border-default text-muted flex items-center justify-center text-xs">
                          {step.stepNumber}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-primary truncate">{step.approverName}</p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isStepComplete
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : isStepRejected
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : 'bg-blue-950 text-blue-400 border border-blue-800'
                          }`}
                        >
                          {step.status}
                        </span>
                      </div>

                      <p className="text-xs text-secondary mt-0.5">
                        {step.decidedAt
                          ? `Decided on ${new Date(step.decidedAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}`
                          : step.remarks || 'Assigned for management review'}
                      </p>

                      {step.remarks && isStepComplete && (
                        <p className="text-xs text-muted italic mt-1 bg-surface/50 p-1.5 rounded border border-border-default/40">
                          "{step.remarks}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Approval Remarks Input */}
          <div className="bg-surface border border-border-default rounded-xl p-6 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">Approval Remarks</h3>

            {isPending && canDecide ? (
              <div>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add your comments or conditions...."
                  rows={4}
                  className="w-full bg-surface-2 border border-border-default rounded-lg p-3 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                />
                <p className="text-[11px] text-muted mt-1">
                  Optional approval notes will be permanently archived in the procurement audit trail.
                </p>
              </div>
            ) : (
              <div className="bg-surface-2 border border-border-default rounded-lg p-4 text-sm text-secondary">
                {approval.remarks ? (
                  <p className="text-primary font-medium italic">"{approval.remarks}"</p>
                ) : (
                  <p className="text-muted">No remarks entered.</p>
                )}
                {approval.decidedBy && (
                  <p className="text-xs text-muted mt-2">
                    Decision recorded by {approval.decidedBy.firstName} {approval.decidedBy.lastName} (
                    {approval.decidedBy.role}) on{' '}
                    {new Date(approval.decidedAt!).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: QUOTATIONS SUMMARY & Action Buttons (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quotations Summary Card (Screen 8) */}
          <div className="bg-surface border border-border-default rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">Quotations Summary</h3>
              <span className="text-xs font-mono text-muted">{approval.rfq.code}</span>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between py-1">
                <span className="text-secondary">Vendor:</span>
                <span className="text-primary font-bold">{approval.quotation.vendor.name}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-border-default/50">
                <span className="text-secondary">Total:</span>
                <span className="text-emerald-400 font-bold text-lg font-mono">
                  {formatMoney(approval.quotation.grandTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-border-default/50">
                <span className="text-secondary">Delivery:</span>
                <span className="text-primary font-medium">{approval.quotation.deliveryDays || 10} days</span>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-border-default/50">
                <span className="text-secondary">Rating:</span>
                <div className="flex items-center gap-1.5 font-medium text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{approval.quotation.vendor.rating ? `${approval.quotation.vendor.rating}/5` : '4.5/5'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-border-default/50">
                <span className="text-secondary">Payment Terms:</span>
                <span className="text-primary font-medium">
                  {approval.quotation.paymentTermsDays ? `${approval.quotation.paymentTermsDays} days net` : '30 days net'}
                </span>
              </div>
            </div>

            {/* Line items quick view */}
            <div className="pt-2 border-t border-border-default">
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-2">
                Included Items ({approval.quotation.items.length})
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {approval.quotation.items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-xs p-2 rounded bg-surface-2 border border-border-default/40"
                  >
                    <span className="text-primary font-medium truncate max-w-[160px]">{item.name}</span>
                    <span className="text-secondary font-mono">
                      {item.quantity} × {formatMoney(item.unitPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Decision Action Buttons (Screen 8) */}
          {isPending && canDecide && (
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="primary"
                size="lg"
                isLoading={approveMutation.isPending}
                onClick={() => approveMutation.mutate(remarks)}
                className="w-full bg-brand hover:bg-brand-hover text-white font-bold shadow-lg"
              >
                Approve
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsRejectModalOpen(true)}
                className="w-full border-red-500/50 text-red-400 hover:bg-red-950/30 font-semibold"
              >
                Reject
              </Button>
            </div>
          )}

          {/* Already Decided Banner / Link to PO */}
          {isApproved && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 space-y-3">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="text-sm font-bold">Approved & Purchase Order Generated</span>
              </div>
              <p className="text-xs text-secondary">
                Official Purchase Order has been created. Click below to view the unified PO & Invoice document.
              </p>
              {approval.quotation.purchaseOrder ? (
                <Button
                  variant="primary"
                  className="w-full bg-emerald-600 hover:bg-emerald-500"
                  onClick={() => navigate(`/purchase-orders/${approval.quotation.purchaseOrder.id}`)}
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  View PO & Invoice ({approval.quotation.purchaseOrder.poNumber})
                </Button>
              ) : (
                <Button
                  variant="primary"
                  className="w-full bg-emerald-600 hover:bg-emerald-500"
                  onClick={() => navigate('/purchase-orders')}
                >
                  View Purchase Orders
                </Button>
              )}
            </div>
          )}

          {isRejected && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 space-y-2 text-red-300">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 shrink-0 text-red-400" />
                <span className="text-sm font-bold text-red-400">Request Rejected</span>
              </div>
              <p className="text-xs text-secondary">
                This procurement request was rejected. The procurement officer can evaluate other vendor proposals.
              </p>
            </div>
          )}

          {!canDecide && isPending && (
            <div className="p-4 rounded-xl bg-surface border border-border-default text-xs text-secondary flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p>
                Only authorized Managers and Administrators can approve or reject procurement requests. Your role (
                {user?.role}) has read-only access.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reject Remarks Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-border-default rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-primary">Reject Procurement Request</h3>
            <p className="text-xs text-secondary">
              Please state the specific reason for rejection. This remark will be visible to the procurement officer and
              archived in the audit trail.
            </p>

            <textarea
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              placeholder="e.g. Budget ceiling exceeded, technical specs require revision..."
              rows={4}
              className="w-full bg-surface-2 border border-border-default rounded-lg p-3 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={!rejectRemarks.trim()}
                isLoading={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate(rejectRemarks)}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
