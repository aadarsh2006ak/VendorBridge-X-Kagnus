import React, { useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Download,
  Printer,
  Mail,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Building2,
  Calendar,
  AlertCircle,
  CreditCard,
  Send,
  Loader2,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { cn } from '../../lib/utils';

export function InvoiceDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const isPoRoute = location.pathname.startsWith('/purchase-orders');
  const isInvoiceRoute = location.pathname.startsWith('/invoices');

  // Modals state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Fetch document (either PO or Invoice)
  const { data: documentData, isLoading, error } = useQuery({
    queryKey: [isPoRoute ? 'purchase-order' : 'invoice', id],
    queryFn: async () => {
      const endpoint = isPoRoute ? `/purchase-orders/${id}` : `/invoices/${id}`;
      const res = await api.get(endpoint);
      return res.data?.data || res.data;
    },
    enabled: Boolean(id),
  });

  // If this is a PO route, the PO might contain an invoice, or vice versa
  const po = isPoRoute ? documentData : documentData?.purchaseOrder;
  const invoice = isInvoiceRoute ? documentData : documentData?.invoice;

  // Invoice ID for operations (email, pdf, status)
  const effectiveInvoiceId = invoice?.id;

  // Generate Invoice from PO Mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/invoices/generate', { purchaseOrderId: po.id });
      return res.data?.data || res.data;
    },
    onSuccess: (newInvoice) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      success(`Invoice ${newInvoice.invoiceNumber || ''} generated successfully!`);
      if (newInvoice?.id) {
        navigate(`/invoices/${newInvoice.id}`);
      }
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || 'Failed to generate invoice.');
    },
  });

  // Mark as Paid Mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveInvoiceId) throw new Error('No invoice found');
      const res = await api.patch(`/invoices/${effectiveInvoiceId}/status`, {
        status: 'PAID',
        paymentReference: paymentReference.trim() || undefined,
        paymentDate: paymentDate || undefined,
        notes: paymentNotes.trim() || undefined,
      });
      return res.data?.data || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsPayModalOpen(false);
      success('Invoice marked as PAID successfully.');
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || 'Failed to update invoice status.');
    },
  });

  // Send Email Mutation
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveInvoiceId) throw new Error('No invoice available to email');
      const res = await api.post(`/invoices/${effectiveInvoiceId}/email`, {
        recipientEmail: recipientEmail.trim(),
        notes: emailMessage.trim() || undefined,
        message: emailMessage.trim() || undefined,
      });
      return res.data?.data || res.data;
    },
    onSuccess: (resData) => {
      setIsEmailModalOpen(false);
      success(`Invoice PDF dispatched to ${resData?.recipient || recipientEmail}!`);
    },
    onError: (err: any) => {
      toastError(err.response?.data?.error?.message || 'Failed to send invoice email.');
    },
  });

  // Download PDF Handler
  const handleDownloadPdf = async () => {
    if (!effectiveInvoiceId) {
      toastError('Invoice must be generated before downloading PDF.');
      return;
    }

    try {
      setIsDownloadingPdf(true);
      const response = await api.get(`/invoices/${effectiveInvoiceId}/pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Invoice-${invoice?.invoiceNumber || effectiveInvoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      success('Invoice PDF downloaded successfully.');
    } catch (err: any) {
      toastError('Failed to download invoice PDF.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Open Email Modal helper
  const handleOpenEmailModal = () => {
    if (!effectiveInvoiceId) {
      toastError('Invoice must be generated before emailing.');
      return;
    }
    const targetEmail =
      vendor?.contactEmail ||
      vendor?.email ||
      invoice?.vendor?.contactEmail ||
      po?.vendor?.contactEmail ||
      user?.email ||
      '';
    setRecipientEmail(targetEmail);
    setEmailMessage(
      `Please find attached official invoice ${invoice?.invoiceNumber || ''} for Purchase Order ${po?.poNumber || ''}.`
    );
    setIsEmailModalOpen(true);
  };

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  const formatMoney = (val: number) => {
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center text-sm text-secondary">
        Loading document details...
      </div>
    );
  }

  if (error || !documentData) {
    return (
      <div className="max-w-md mx-auto p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-primary">Document Not Found</h2>
        <p className="text-sm text-secondary">
          Could not find the requested purchase order or invoice.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate(isPoRoute ? '/purchase-orders' : '/invoices')}
        >
          Back to Documents
        </Button>
      </div>
    );
  }

  // Derive vendor and items from PO or Invoice
  const vendor = invoice?.vendor || po?.vendor;
  const rfq = invoice?.rfq || po?.rfq;
  const items = invoice?.items || po?.items || [];
  const subtotal = invoice?.subtotal || po?.subtotal || 0;
  const taxAmount = invoice?.taxAmount || po?.taxAmount || 0;
  const grandTotal = invoice?.grandTotal || po?.grandTotal || 0;
  const isPaid = invoice?.status === 'PAID';
  const isPendingPayment = invoice?.status === 'PENDING_PAYMENT';
  const canMarkPaid = (user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'PROCUREMENT_OFFICER');

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        {/* Back Link */}
        <Link
          to={isPoRoute ? '/purchase-orders' : '/invoices'}
          className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to {isPoRoute ? 'Purchase Orders' : 'Invoices'}
        </Link>

        {/* Action Buttons matching Screen 9 */}
        <div className="flex items-center gap-2 flex-wrap">
          {effectiveInvoiceId ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="h-9 px-3 text-xs inline-flex items-center gap-1.5"
              >
                {isDownloadingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Download PDF</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-9 px-3 text-xs inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenEmailModal}
                className="h-9 px-3.5 text-xs bg-brand-500 hover:bg-brand-600 inline-flex items-center gap-1.5 shadow-sm"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Invoice</span>
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => generateInvoiceMutation.mutate()}
              disabled={generateInvoiceMutation.isPending}
              className="h-9 px-4 text-xs bg-brand-500 hover:bg-brand-600 inline-flex items-center gap-1.5 shadow-sm"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>
                {generateInvoiceMutation.isPending ? 'Generating...' : 'Generate Invoice from PO'}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Screen 9 Title Header (matches Excalidraw mockup Screen 9) */}
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-primary tracking-tight">Purchase Order & Invoice</h1>
        <p className="text-sm text-secondary mt-0.5">
          Official procurement document generated from approved quotation.
        </p>
      </div>

      {/* Missing Invoice Notice for POs */}
      {!effectiveInvoiceId && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start justify-between gap-4 print:hidden">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-300">
                Purchase Order {po?.poNumber} is active
              </p>
              <p className="text-xs text-amber-200/80 mt-0.5">
                The invoice has not been generated for this purchase order yet. Click below to generate the formal invoice.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => generateInvoiceMutation.mutate()}
            disabled={generateInvoiceMutation.isPending}
            className="text-xs bg-amber-500 hover:bg-amber-600 text-black font-medium shrink-0"
          >
            Generate Invoice
          </Button>
        </div>
      )}

      {/* The Printable Official Document Sheet (Screen 9 Paper Layout) */}
      <div
        id="printable-invoice"
        className="bg-card rounded-2xl border border-border p-8 sm:p-10 space-y-8 shadow-xl print:border-none print:shadow-none print:p-0 print:bg-white print:text-black"
      >
        {/* Document Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 print:border-black print:text-black">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-bold text-primary tracking-tight print:text-black">
                VendorBridge Enterprise
              </span>
              <p className="text-xs text-secondary print:text-gray-600">
                Enterprise Procurement & Vendor Management
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="inline-block px-3 py-1 rounded-md text-xs font-mono font-bold uppercase tracking-wider bg-brand-500/15 text-brand-400 border border-brand-500/30 print:border-black print:text-black print:bg-transparent">
              {invoice ? 'OFFICIAL INVOICE' : 'PURCHASE ORDER'}
            </span>
            <div className="text-xs text-secondary mt-1 font-mono">
              Status:{' '}
              <span className="font-semibold text-primary capitalize print:text-black">
                {invoice ? invoice.status.replace('_', ' ') : po?.status || 'Issued'}
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column: Bill To & Vendor Details (Screen 9) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Bill To */}
          <div className="p-5 rounded-xl border border-border/80 bg-muted/20 space-y-2 print:border-gray-300 print:bg-transparent">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Bill To (Buyer)
            </span>
            <h4 className="text-sm font-bold text-primary print:text-black">
              VendorBridge Enterprise Corp
            </h4>
            <p className="text-xs text-secondary leading-relaxed print:text-gray-700">
              402 Tech Boulevard, Cyber City<br />
              Hyderabad, Telangana 500081, India<br />
              <span className="font-mono text-[11px]">GSTIN: 36AAACV1234F1Z5</span><br />
              procurement@vendorbridge.internal
            </p>
          </div>

          {/* Vendor Details */}
          <div className="p-5 rounded-xl border border-border/80 bg-muted/20 space-y-2 print:border-gray-300 print:bg-transparent">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Vendor Details (Supplier)
            </span>
            <h4 className="text-sm font-bold text-primary print:text-black">
              {vendor?.name || 'Authorized Supplier'}
            </h4>
            <p className="text-xs text-secondary leading-relaxed print:text-gray-700">
              {vendor?.address ? `${vendor.address}, ` : ''}
              {vendor?.city ? `${vendor.city}, ` : ''}
              {vendor?.state ? `${vendor.state} ` : ''}
              {vendor?.pinCode || ''}<br />
              <span className="font-mono text-[11px]">GSTIN: {vendor?.gstNumber || 'N/A'}</span><br />
              {vendor?.contactEmail || vendor?.email || 'N/A'}{' '}
              {vendor?.contactPhone || vendor?.phone ? `• ${vendor.contactPhone || vendor.phone}` : ''}
            </p>
          </div>
        </div>

        {/* Document Meta Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border border-border/60 bg-muted/10 print:border-gray-300 print:bg-transparent text-xs">
          <div>
            <span className="text-muted-foreground text-[10px] uppercase font-semibold block">
              PO Number
            </span>
            <span className="font-mono font-bold text-primary print:text-black mt-0.5 block">
              {po?.poNumber || '—'}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground text-[10px] uppercase font-semibold block">
              PO Date
            </span>
            <span className="font-medium text-primary print:text-black mt-0.5 block">
              {formatDate(po?.issueDate || po?.createdAt)}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground text-[10px] uppercase font-semibold block">
              Invoice Number
            </span>
            <span className="font-mono font-bold text-brand-400 print:text-black mt-0.5 block">
              {invoice?.invoiceNumber || 'Pending'}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground text-[10px] uppercase font-semibold block">
              Payment Due Date
            </span>
            <span className="font-medium text-primary print:text-black mt-0.5 block">
              {formatDate(invoice?.dueDate)}
            </span>
          </div>
        </div>

        {/* Line Items Table (Screen 9) */}
        <div className="overflow-x-auto rounded-xl border border-border print:border-gray-300">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-secondary font-medium uppercase tracking-wider print:bg-gray-100 print:text-black print:border-gray-300">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Item / Description</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Tax</th>
                <th className="py-3 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border print:divide-gray-300">
              {items.map((item: any, idx: number) => {
                const itemTotal = (item.quantity || 1) * (item.unitPrice || 0);
                return (
                  <tr key={item.id || idx} className="hover:bg-muted/10 print:hover:bg-transparent">
                    <td className="py-3.5 px-4 text-center font-mono text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-primary print:text-black block">
                        {item.title}
                      </span>
                      {item.description && (
                        <span className="text-[11px] text-secondary print:text-gray-600 block mt-0.5">
                          {item.description}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-medium text-primary print:text-black">
                      {item.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-secondary print:text-black">
                      {formatMoney(item.unitPrice)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-muted-foreground print:text-black">
                      {item.taxRate ? `${item.taxRate}%` : '18% GST'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-primary print:text-black">
                      {formatMoney(itemTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Tax Breakdown (Golden Math matching Screen 9) */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pt-2">
          {/* Terms & Notes (Left) */}
          <div className="sm:max-w-md space-y-3">
            <span className="text-xs font-bold text-primary print:text-black block">
              Terms & Conditions
            </span>
            <ul className="text-[11px] text-secondary space-y-1 list-disc pl-4 leading-relaxed print:text-gray-700">
              <li>Goods must be delivered according to specified specifications and timelines.</li>
              <li>Payment terms: Net {po?.paymentTermsDays || 30} days from invoice verification date.</li>
              <li>Taxes applied in accordance with GST Act (CGST 9% + SGST 9%).</li>
              <li>This is an authoritative, digitally signed enterprise document.</li>
            </ul>

            {rfq && (
              <div className="pt-2 text-[11px] text-muted-foreground print:hidden">
                Referenced RFQ:{' '}
                <Link
                  to={`/rfqs/${rfq.id}`}
                  className="text-brand-400 hover:underline font-medium"
                >
                  {rfq.title} ({rfq.code})
                </Link>
              </div>
            )}
          </div>

          {/* Totals Block (Right) */}
          <div className="sm:w-80 rounded-xl border border-border bg-muted/20 p-4 space-y-2.5 print:border-gray-300 print:bg-transparent">
            <div className="flex justify-between text-xs">
              <span className="text-secondary print:text-gray-600">Subtotal</span>
              <span className="font-mono font-medium text-primary print:text-black">
                {formatMoney(subtotal)}
              </span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-secondary print:text-gray-600">CGST (9.0%)</span>
              <span className="font-mono text-secondary print:text-black">
                {formatMoney(taxAmount / 2)}
              </span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-secondary print:text-gray-600">SGST (9.0%)</span>
              <span className="font-mono text-secondary print:text-black">
                {formatMoney(taxAmount / 2)}
              </span>
            </div>

            <div className="flex justify-between text-xs border-t border-border/80 pt-2 print:border-gray-300">
              <span className="text-secondary font-medium print:text-gray-600">Total Tax (18%)</span>
              <span className="font-mono text-primary font-medium print:text-black">
                {formatMoney(taxAmount)}
              </span>
            </div>

            <div className="flex justify-between text-sm border-t border-border pt-2.5 font-bold print:border-gray-300">
              <span className="text-primary print:text-black">Grand Total</span>
              <span className="font-mono text-emerald-400 print:text-black text-base">
                {formatMoney(grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Status & Mark as Paid Action (Matches Screen 9) */}
        {invoice && (
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:border-gray-300">
            <div className="flex items-center gap-3">
              <span className="text-xs text-secondary print:text-gray-600">Document Status:</span>
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5',
                  isPaid
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                )}
              >
                {isPaid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Paid
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    Pending Payment
                  </>
                )}
              </span>

              {isPaid && invoice.paymentReference && (
                <span className="text-xs text-muted-foreground font-mono">
                  Ref: {invoice.paymentReference}
                </span>
              )}
            </div>

            {/* Mark as Paid button (Screen 9 footer action) */}
            {isPendingPayment && canMarkPaid && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsPayModalOpen(true)}
                className="h-8 px-4 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium inline-flex items-center gap-1.5 print:hidden shadow-sm"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Mark as Paid</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Email Modal */}
      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title="Email Invoice to Vendor / Recipient"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-secondary">
            Dispatch official invoice{' '}
            <span className="font-mono text-primary font-bold">{invoice?.invoiceNumber}</span> with
            attached PDF via secure SMTP delivery.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-primary">Recipient Email</label>
            <Input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="e.g. accounts@vendor.com"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-primary">Message / Note</label>
            <Textarea
              rows={3}
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              placeholder="Add optional remarks..."
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEmailModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => sendEmailMutation.mutate()}
              disabled={sendEmailMutation.isPending || !recipientEmail.trim()}
              className="text-xs bg-brand-500 hover:bg-brand-600 font-medium inline-flex items-center gap-1.5"
            >
              {sendEmailMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Mark as Paid Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Confirm Payment Settlement"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-secondary">
            Record payment settlement for Invoice{' '}
            <span className="font-mono text-primary font-bold">{invoice?.invoiceNumber}</span> (Grand Total:{' '}
            <span className="text-emerald-400 font-semibold">{formatMoney(grandTotal)}</span>).
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-primary">Payment Reference / UTR Number</label>
            <Input
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g. NEFT-2025-00912 or CHEQUE-4401"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-primary">Settlement Date</label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-primary">Settlement Notes (Optional)</label>
            <Textarea
              rows={2}
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="e.g. Processed via HDFC Corporate Banking"
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPayModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => markAsPaidMutation.mutate()}
              disabled={markAsPaidMutation.isPending}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium inline-flex items-center gap-1.5"
            >
              {markAsPaidMutation.isPending ? 'Updating...' : 'Confirm Payment'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
