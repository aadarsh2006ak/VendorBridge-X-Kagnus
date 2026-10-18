import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';
import { prisma } from '../../../lib/prisma.js';

describe('Vendor Features & Functional Tests', () => {
  const CSRF_HEADER = { 'X-Requested-With': 'VendorBridge' };
  let officerCookies: string[];

  beforeAll(async () => {
    const officerRes = await request(app)
      .post('/api/v1/auth/login')
      .set(CSRF_HEADER)
      .send({ email: 'officer@vendorbridge.local', password: 'Password@123' });
    officerCookies = officerRes.headers['set-cookie'];
  });

  describe('Search and Filter (GET /api/v1/vendors)', () => {
    it('should paginate results with meta and counts', async () => {
      const res = await request(app)
        .get('/api/v1/vendors?page=1&limit=5')
        .set('Cookie', officerCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(5);
      expect(res.body.counts.all).toBeGreaterThanOrEqual(20);
      expect(res.body.counts.active).toBeGreaterThanOrEqual(1);
      expect(res.body.counts.pending).toBeGreaterThanOrEqual(1);
      expect(res.body.counts.blocked).toBeGreaterThanOrEqual(1);
    });

    it('should filter vendors by status while preserving accurate overall status counts', async () => {
      const res = await request(app)
        .get('/api/v1/vendors?status=BLOCKED')
        .set('Cookie', officerCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.every((v: any) => v.status === 'BLOCKED')).toBe(true);
      // Ensure the counts on the chips still show all, active, pending, blocked
      expect(res.body.counts.all).toBeGreaterThanOrEqual(20);
      expect(res.body.counts.blocked).toBeGreaterThanOrEqual(1);
    });

    it('should search vendors by name case-insensitively', async () => {
      const res = await request(app)
        .get('/api/v1/vendors?search=infra')
        .set('Cookie', officerCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].name.toLowerCase()).toContain('infra');
    });

    it('should search vendors by GST number', async () => {
      const res = await request(app)
        .get('/api/v1/vendors?search=27AABCS1429B1Z0')
        .set('Cookie', officerCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].gstNumber).toBe('27AABCS1429B1Z0');
    });
  });

  describe('Vendor Validation and Conflict (POST /api/v1/vendors)', () => {
    it('should reject invalid GST format with 400 Validation Error', async () => {
      const res = await request(app)
        .post('/api/v1/vendors')
        .set(CSRF_HEADER)
        .set('Cookie', officerCookies)
        .send({
          name: 'Invalid GST Vendor',
          category: 'IT Hardware',
          gstNumber: 'INVALID_GST_123',
          contactName: 'John Doe',
          contactEmail: 'john@example.com',
          contactPhone: '+919876543210',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: any) => d.field === 'gstNumber')).toBe(true);
    });

    it('should reject duplicate GST number with 409 Conflict', async () => {
      // 27AABCS1429B1Z0 already exists in seed data
      const res = await request(app)
        .post('/api/v1/vendors')
        .set(CSRF_HEADER)
        .set('Cookie', officerCookies)
        .send({
          name: 'Duplicate GST Vendor',
          category: 'Construction',
          gstNumber: '27AABCS1429B1Z0',
          contactName: 'Jane Doe',
          contactEmail: 'jane@example.com',
          contactPhone: '+919876543210',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('Dashboard Summary (GET /api/v1/dashboard/summary)', () => {
    it('should return dashboard summary metrics with zero values for future weeks', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Cookie', officerCookies);

      expect(res.status).toBe(200);
      expect(res.body.activeRfqs).toBe(0);
      expect(res.body.pendingApprovals).toBe(0);
      expect(res.body.posThisMonth).toEqual({ count: 0, amount: 0 });
      expect(res.body.overdueInvoices).toBe(0);
      expect(Array.isArray(res.body.recentPurchaseOrders)).toBe(true);
      expect(Array.isArray(res.body.spendingTrend)).toBe(true);
    });
  });
});
