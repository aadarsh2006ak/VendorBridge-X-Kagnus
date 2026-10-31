import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { InvoiceController } from './invoice.controller.js';

export const invoiceRouter = Router();

invoiceRouter.use(authenticate);

// List invoices (Staff sees all, Vendor sees own)
invoiceRouter.get('/', authorize('invoice:read'), InvoiceController.listInvoices);

// Get invoice detail (Screen 9)
invoiceRouter.get('/:id', authorize('invoice:read'), InvoiceController.getInvoiceById);

// Generate invoice from valid purchase order (Staff/Vendor)
invoiceRouter.post('/generate', authorize('invoice:create'), InvoiceController.createFromPurchaseOrder);

// Mark as Paid / Update status (Manager and Admin)
invoiceRouter.patch('/:id/status', authorize('invoice:markPaid'), InvoiceController.updateStatus);

// Download PDF (Screen 9 "Download PDF" button)
invoiceRouter.get('/:id/pdf', authorize('invoice:read'), InvoiceController.downloadPdf);

// Email invoice (Screen 9 "Email invoice" button)
invoiceRouter.post('/:id/email', authorize('invoice:email'), InvoiceController.emailInvoice);
