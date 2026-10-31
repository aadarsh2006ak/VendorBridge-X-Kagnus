import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';
import { prisma } from '../../../lib/prisma.js';

describe('Week 3: Approvals, Purchase Orders & Invoices Workflow Tests', () => {
  const CSRF_HEADER = { 'X-Requested-With': 'VendorBridge' };

  let adminCookies: string[];
  let officerCookies: string[];
  let managerCookies: string[];
  let vendorCookies: string[];

  let pendingApprovalId: string;
  let goldenPoId: string;
  let goldenInvoiceId: string;

  beforeAll(async () => {
    // 1. Authenticate all roles
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .set(CSRF_HEADER)
      .send({ email: 'admin@vendorbridge.local', password: 'Password@123' });
    adminCookies = adminRes.headers['set-cookie'];

    const officerRes = await request(app)
      .post('/api/v1/auth/login')
      .set(CSRF_HEADER)
      .send({ email: 'officer@vendorbridge.local', password: 'Password@123' });
    officerCookies = officerRes.headers['set-cookie'];

    const managerRes = await request(app)
      .post('/api/v1/auth/login')
      .set(CSRF_HEADER)
      .send({ email: 'manager@vendorbridge.local', password: 'Password@123' });
    managerCookies = managerRes.headers['set-cookie'];

    const vendorRes = await request(app)
      .post('/api/v1/auth/login')
      .set(CSRF_HEADER)
      .send({ email: 'vendor@vendorbridge.local', password: 'Password@123' });
    vendorCookies = vendorRes.headers['set-cookie'];

    // 2. Create fresh isolated test RFQ + Quotation + ApprovalRequest for idempotent approval testing
    const testOfficer = await prisma.user.findUnique({ where: { email: 'officer@vendorbridge.local' } });
    const testVendor = await prisma.vendor.findFirst({ where: { status: 'ACTIVE' } });

    const testRfq = await prisma.rfq.create({
      data: {
        code: `RFQ-TEST-${Date.now()}`,
        title: 'Integration Test RFQ for Approval Workflow',
        category: 'IT Equipment',
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: 'QUOTATION_SELECTED',
        createdById: testOfficer!.id,
        items: {
          create: [
            {
              position: 1,
              name: 'Enterprise Database Server',
              quantity: 2,
              unit: 'Units',
            },
          ],
        },
      },
      include: { items: true },
    });

    const testQuote = await prisma.quotation.create({
      data: {
        rfqId: testRfq.id,
        vendorId: testVendor!.id,
        status: 'SUBMITTED',
        taxRate: 18,
        subtotal: 100000,
        taxAmount: 18000,
        grandTotal: 118000,
        deliveryDays: 7,
        items: {
          create: [
            {
              rfqItemId: testRfq.items[0].id,
              unitPrice: 50000,
              deliveryDays: 7,
              lineTotal: 100000,
            },
          ],
        },
      },
    });

    const pending = await prisma.approvalRequest.create({
      data: {
        rfqId: testRfq.id,
        quotationId: testQuote.id,
        requestedById: testOfficer!.id,
        status: 'PENDING',
        currentStep: 3,
        timeline: {
          create: [
            {
              stepNumber: 1,
              stepName: 'Submitted',
              approverName: `${testOfficer!.firstName} ${testOfficer!.lastName} (Procurement head)`,
              approverRole: 'Procurement Officer',
              status: 'APPROVED',
              decidedAt: new Date(),
              remarks: 'Submitted for evaluation',
            },
            {
              stepNumber: 2,
              stepName: 'L1 Review',
              approverName: 'Rahul Mehta (Procurement head)',
              approverRole: 'Procurement Head',
              status: 'APPROVED',
              decidedAt: new Date(),
              remarks: 'Approved on review',
            },
            {
              stepNumber: 3,
              stepName: 'L2 approval',
              approverName: 'Priya Shah (Finance manager)',
              approverRole: 'Finance Manager',
              status: 'AWAITING',
              remarks: 'Assigned for management sign-off',
            },
            {
              stepNumber: 4,
              stepName: 'Generate PO',
              approverName: 'Operations Team',
              approverRole: 'Procurement Operations',
              status: 'PENDING',
              remarks: 'Pending L2 approval',
            },
          ],
        },
      },
    });
    pendingApprovalId = pending.id;

    // 3. Fetch golden PO and Invoice, ensuring clean initial status
    const goldenPo = await prisma.purchaseOrder.findFirst({
      where: { poNumber: 'PO-2025-0068' },
    });
    if (goldenPo) goldenPoId = goldenPo.id;

    const goldenInv = await prisma.invoice.findFirst({
      where: { invoiceNumber: 'INV-2025-0001' },
    });
    if (goldenInv) {
      goldenInvoiceId = goldenInv.id;
      await prisma.invoice.update({
        where: { id: goldenInv.id },
        data: { status: 'PENDING_PAYMENT', paidAt: null },
      });
    }
  });

  describe('Deliverable 1: Approval Workflow Management', () => {
    it('should list approval requests with status counts (GET /api/v1/approvals)', async () => {
      const res = await request(app)
        .get('/api/v1/approvals')
        .set('Cookie', managerCookies);

      expect(res.status).toBe(200);
      expect(res.body.items).toBeDefined();
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.counts).toBeDefined();
      expect(res.body.counts.all).toBeGreaterThanOrEqual(1);
    });

    it('should get full approval request details matching Screen 8 (GET /api/v1/approvals/:id)', async () => {
      const res = await request(app)
        .get(`/api/v1/approvals/${pendingApprovalId}`)
        .set('Cookie', managerCookies);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(pendingApprovalId);
      expect(res.body.rfq).toBeDefined();
      expect(res.body.quotation).toBeDefined();
      expect(res.body.timeline).toBeDefined();
      expect(res.body.timeline.length).toBe(4); // 4-step chain: Submitted, L1 Review, L2 Approval, Generate PO
    });

    it('should prevent unauthorized users (Procurement Officer) from approving (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/approvals/${pendingApprovalId}/approve`)
        .set(CSRF_HEADER)
        .set('Cookie', officerCookies)
        .send({ remarks: 'Self-approval attempt' });

      expect(res.status).toBe(403);
    });

    it('should prevent unauthorized users (Vendor) from approving (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/approvals/${pendingApprovalId}/approve`)
        .set(CSRF_HEADER)
        .set('Cookie', vendorCookies)
        .send({ remarks: 'Vendor attempt' });

      expect(res.status).toBe(403);
    });

    it('should allow authorized Manager to approve request and automatically generate Purchase Order (200)', async () => {
      const res = await request(app)
        .post(`/api/v1/approvals/${pendingApprovalId}/approve`)
        .set(CSRF_HEADER)
        .set('Cookie', managerCookies)
        .send({ remarks: 'Approved on financial review by Priya Shah.' });

      expect(res.status).toBe(200);
      expect(res.body.data.approval.status).toBe('APPROVED');
      expect(res.body.data.purchaseOrder).toBeDefined();
      expect(res.body.data.purchaseOrder.poNumber).toMatch(/^PO-\d{4}-\d{4}$/);
      expect(res.body.data.purchaseOrder.status).toBe('ISSUED');

      // Verify Quotation was marked APPROVED in database
      const quote = await prisma.quotation.findUnique({
        where: { id: res.body.data.approval.quotationId },
      });
      expect(quote?.status).toBe('APPROVED');
    });

    it('should reject already approved request if attempted again (409 Conflict / Invalid Transition)', async () => {
      const res = await request(app)
        .post(`/api/v1/approvals/${pendingApprovalId}/approve`)
        .set(CSRF_HEADER)
        .set('Cookie', managerCookies)
        .send({ remarks: 'Duplicate approval attempt' });

      expect(res.status).toBe(409);
    });
  });

  describe('Deliverable 2: Purchase Order Management', () => {
    it('should list purchase orders (GET /api/v1/purchase-orders)', async () => {
      const res = await request(app)
        .get('/api/v1/purchase-orders')
        .set('Cookie', officerCookies);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.counts.all).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve single purchase order with details (GET /api/v1/purchase-orders/:id)', async () => {
      const res = await request(app)
        .get(`/api/v1/purchase-orders/${goldenPoId}`)
        .set('Cookie', officerCookies);

      expect(res.status).toBe(200);
      expect(res.body.poNumber).toBe('PO-2025-0068');
      expect(res.body.buyer.gstin).toBe('25383438AFB');
      expect(res.body.vendor.name).toContain('Infra Supplies');
      expect(res.body.financials.grandTotal).toBe(200010);
      expect(res.body.financials.cgstAmount).toBe(15255);
      expect(res.body.financials.sgstAmount).toBe(15255);
      expect(res.body.items.length).toBe(2);
    });

    it('should prevent duplicate PO generation for the same quotation (409 Conflict)', async () => {
      const po = await prisma.purchaseOrder.findUnique({ where: { id: goldenPoId } });
      const res = await request(app)
        .post('/api/v1/purchase-orders/generate')
        .set(CSRF_HEADER)
        .set('Cookie', officerCookies)
        .send({ quotationId: po!.quotationId });

      expect(res.status).toBe(409);
    });

    it('should enforce object-level security: vendor cannot access unrelated PO (404 Not Found)', async () => {
      // goldenPoId belongs to Infra Supplies. vendorUser is linked to Apex Technologies.
      const res = await request(app)
        .get(`/api/v1/purchase-orders/${goldenPoId}`)
        .set('Cookie', vendorCookies);

      expect(res.status).toBe(404);
    });
  });

  describe('Deliverable 3: Invoice Generation, PDF & Email', () => {
    it('should list invoices (GET /api/v1/invoices)', async () => {
      const res = await request(app)
        .get('/api/v1/invoices')
        .set('Cookie', officerCookies);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.counts.all).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve single invoice with line items (GET /api/v1/invoices/:id)', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/${goldenInvoiceId}`)
        .set('Cookie', officerCookies);

      expect(res.status).toBe(200);
      expect(res.body.invoiceNumber).toBe('INV-2025-0001');
      expect(res.body.status).toBe('PENDING_PAYMENT');
      expect(res.body.financials.grandTotal).toBe(200010);
    });

    it('should prevent duplicate invoice generation for the same PO (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/v1/invoices/generate')
        .set(CSRF_HEADER)
        .set('Cookie', officerCookies)
        .send({ purchaseOrderId: goldenPoId });

      expect(res.status).toBe(409);
    });

    it('should update invoice status to PAID (PATCH /api/v1/invoices/:id/status)', async () => {
      const res = await request(app)
        .patch(`/api/v1/invoices/${goldenInvoiceId}/status`)
        .set(CSRF_HEADER)
        .set('Cookie', managerCookies)
        .send({ status: 'PAID' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PAID');
      expect(res.body.data.paidAt).toBeDefined();
    });

    it('should download invoice PDF binary stream (GET /api/v1/invoices/:id/pdf)', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/${goldenInvoiceId}/pdf`)
        .set('Cookie', officerCookies);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('INV-2025-0001.pdf');
      expect(res.body.length).toBeGreaterThan(100);
    });

    it('should dispatch invoice email with PDF attachment and return success result (POST /api/v1/invoices/:id/email)', async () => {
      const res = await request(app)
        .post(`/api/v1/invoices/${goldenInvoiceId}/email`)
        .set(CSRF_HEADER)
        .set('Cookie', officerCookies)
        .send({ recipientEmail: 'accounting@infrasupplies.local' });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.recipient).toBe('accounting@infrasupplies.local');
    });
  });
});
