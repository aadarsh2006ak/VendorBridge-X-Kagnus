import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';

describe('Week 4: Activity Logs, Notifications, Reports & Analytics Tests', () => {
  const CSRF_HEADER = { 'X-Requested-With': 'VendorBridge' };

  let adminCookies: string[];
  let managerCookies: string[];
  let officerCookies: string[];
  let vendorCookies: string[];

  beforeAll(async () => {
    // Login as Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .set(CSRF_HEADER)
      .send({
        email: 'admin@vendorbridge.local',
        password: 'Password@123',
      });
    adminCookies = adminRes.headers['set-cookie'];

    // Login as Manager
    const managerRes = await request(app)
      .post('/api/v1/auth/login')
      .set(CSRF_HEADER)
      .send({
        email: 'manager@vendorbridge.local',
        password: 'Password@123',
      });
    managerCookies = managerRes.headers['set-cookie'];

    // Login as Procurement Officer
    const officerRes = await request(app)
      .post('/api/v1/auth/login')
      .set(CSRF_HEADER)
      .send({
        email: 'officer@vendorbridge.local',
        password: 'Password@123',
      });
    officerCookies = officerRes.headers['set-cookie'];

    // Login as Vendor
    const vendorRes = await request(app)
      .post('/api/v1/auth/login')
      .set(CSRF_HEADER)
      .send({
        email: 'vendor@vendorbridge.local',
        password: 'Password@123',
      });
    vendorCookies = vendorRes.headers['set-cookie'];
  });

  describe('Deliverable 1: Notifications Engine', () => {
    it('should list user notifications with unread count (GET /api/v1/notifications)', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Cookie', managerCookies);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(typeof res.body.unreadCount).toBe('number');
      expect(res.body.pagination).toBeDefined();
    });

    it('should return unread count for topbar badge (GET /api/v1/notifications/unread-count)', async () => {
      const res = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Cookie', managerCookies);

      expect(res.status).toBe(200);
      expect(typeof res.body.unreadCount).toBe('number');
    });

    it('should mark a notification as read (PATCH /api/v1/notifications/:id/read)', async () => {
      const listRes = await request(app)
        .get('/api/v1/notifications')
        .set('Cookie', managerCookies);

      if (listRes.body.items?.length > 0) {
        const notifId = listRes.body.items[0].id;
        const res = await request(app)
          .patch(`/api/v1/notifications/${notifId}/read`)
          .set(CSRF_HEADER)
          .set('Cookie', managerCookies);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      }
    });

    it('should mark all notifications as read (PATCH /api/v1/notifications/mark-all-read)', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/mark-all-read')
        .set(CSRF_HEADER)
        .set('Cookie', managerCookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Deliverable 1: Activity Timeline & Audit Logs', () => {
    it('should list chronological audit logs with actor details (GET /api/v1/audit)', async () => {
      const res = await request(app)
        .get('/api/v1/audit')
        .set('Cookie', managerCookies);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThan(0);

      const firstLog = res.body.items[0];
      expect(firstLog).toHaveProperty('action');
      expect(firstLog).toHaveProperty('entityType');
      expect(firstLog).toHaveProperty('createdAt');
      expect(firstLog).toHaveProperty('actor');
    });

    it('should return audit stats breakdown (GET /api/v1/audit/stats)', async () => {
      const res = await request(app)
        .get('/api/v1/audit/stats')
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(typeof res.body.totalEvents).toBe('number');
      expect(Array.isArray(res.body.entityBreakdown)).toBe(true);
    });

    it('should reject unauthorized vendor access to audit logs with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/audit')
        .set('Cookie', vendorCookies);

      expect(res.status).toBe(403);
    });
  });

  describe('Deliverable 2: Reports & Analytics Dashboard', () => {
    it('should return procurement summary metrics (GET /api/v1/reports/summary)', async () => {
      const res = await request(app)
        .get('/api/v1/reports/summary')
        .set('Cookie', managerCookies);

      expect(res.status).toBe(200);
      expect(typeof res.body.totalSpend).toBe('number');
      expect(typeof res.body.totalInvoiced).toBe('number');
      expect(typeof res.body.totalPaid).toBe('number');
      expect(typeof res.body.totalPOs).toBe('number');
      expect(typeof res.body.activeRfqsCount).toBe('number');
      expect(typeof res.body.totalVendorsCount).toBe('number');
    });

    it('should return 6-month monthly spending trends (GET /api/v1/reports/spending-trends)', async () => {
      const res = await request(app)
        .get('/api/v1/reports/spending-trends?months=6')
        .set('Cookie', officerCookies);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(6);

      const first = res.body[0];
      expect(first).toHaveProperty('month');
      expect(first).toHaveProperty('label');
      expect(first).toHaveProperty('poAmount');
      expect(first).toHaveProperty('poCount');
    });

    it('should return spend by category breakdown (GET /api/v1/reports/category-breakdown)', async () => {
      const res = await request(app)
        .get('/api/v1/reports/category-breakdown')
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(typeof res.body.totalSpend).toBe('number');
      expect(Array.isArray(res.body.categories)).toBe(true);
    });

    it('should return vendor performance analytics (GET /api/v1/reports/vendor-performance)', async () => {
      const res = await request(app)
        .get('/api/v1/reports/vendor-performance')
        .set('Cookie', managerCookies);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        const v = res.body[0];
        expect(v).toHaveProperty('name');
        expect(v).toHaveProperty('totalOrders');
        expect(v).toHaveProperty('totalSpend');
        expect(v).toHaveProperty('rating');
        expect(v).toHaveProperty('winRate');
      }
    });

    it('should export spend report as CSV (GET /api/v1/reports/export/spend)', async () => {
      const res = await request(app)
        .get('/api/v1/reports/export/spend')
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment; filename=');
      expect(res.text).toContain('Month');
      expect(res.text).toContain('PO Spend (INR)');
    });

    it('should export vendor performance as CSV (GET /api/v1/reports/export/vendors)', async () => {
      const res = await request(app)
        .get('/api/v1/reports/export/vendors')
        .set('Cookie', officerCookies);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Vendor Name');
      expect(res.text).toContain('Total Spend (INR)');
    });

    it('should export purchase orders as CSV (GET /api/v1/reports/export/purchase_orders)', async () => {
      const res = await request(app)
        .get('/api/v1/reports/export/purchase_orders')
        .set('Cookie', managerCookies);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('PO Number');
    });

    it('should export invoices as CSV (GET /api/v1/reports/export/invoices)', async () => {
      const res = await request(app)
        .get('/api/v1/reports/export/invoices')
        .set('Cookie', managerCookies);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Invoice Number');
    });

    it('should reject unauthorized vendor access to reports with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/reports/summary')
        .set('Cookie', vendorCookies);

      expect(res.status).toBe(403);
    });
  });
});
