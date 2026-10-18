import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';
import { prisma } from '../../../lib/prisma.js';

describe('Role × Vendor Endpoint Matrix Test (RBAC Verification)', () => {
  const CSRF_HEADER = { 'X-Requested-With': 'VendorBridge' };

  // Cookie storage for each role
  let adminCookies: string[];
  let officerCookies: string[];
  let managerCookies: string[];
  let vendorCookies: string[];

  let sampleVendorId: string;

  beforeAll(async () => {
    // Clean up any test artifacts from prior runs
    await prisma.vendor.deleteMany({
      where: { contactName: 'Matrix Contact' },
    });
    // Login as Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .set(CSRF_HEADER)
      .send({ email: 'admin@vendorbridge.local', password: 'Password@123' });
    adminCookies = adminRes.headers['set-cookie'];

    // Login as Procurement Officer
    const officerRes = await request(app)
      .post('/api/v1/auth/login')
      .set(CSRF_HEADER)
      .send({ email: 'officer@vendorbridge.local', password: 'Password@123' });
    officerCookies = officerRes.headers['set-cookie'];

    // Login as Manager / Approver
    const managerRes = await request(app)
      .post('/api/v1/auth/login')
      .set(CSRF_HEADER)
      .send({ email: 'manager@vendorbridge.local', password: 'Password@123' });
    managerCookies = managerRes.headers['set-cookie'];

    // Login as Vendor
    const vendorRes = await request(app)
      .post('/api/v1/auth/login')
      .set(CSRF_HEADER)
      .send({ email: 'vendor@vendorbridge.local', password: 'Password@123' });
    vendorCookies = vendorRes.headers['set-cookie'];

    // Fetch an existing sample vendor
    const firstVendor = await prisma.vendor.findFirst({
      where: { deletedAt: null },
    });
    sampleVendorId = firstVendor!.id;
  });

  // 1. LIST VENDORS (GET /api/v1/vendors)
  describe('GET /api/v1/vendors (vendor:read)', () => {
    it('Admin: ALLOWED (200)', async () => {
      const res = await request(app).get('/api/v1/vendors').set('Cookie', adminCookies);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('Procurement Officer: ALLOWED (200)', async () => {
      const res = await request(app).get('/api/v1/vendors').set('Cookie', officerCookies);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('Manager / Approver: ALLOWED (200)', async () => {
      const res = await request(app).get('/api/v1/vendors').set('Cookie', managerCookies);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('Vendor: FORBIDDEN (403)', async () => {
      const res = await request(app).get('/api/v1/vendors').set('Cookie', vendorCookies);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Anonymous: UNAUTHENTICATED (401)', async () => {
      const res = await request(app).get('/api/v1/vendors');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });
  });

  // 2. VIEW VENDOR DETAIL (GET /api/v1/vendors/:id)
  describe('GET /api/v1/vendors/:id (vendor:read)', () => {
    it('Admin: ALLOWED (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/vendors/${sampleVendorId}`)
        .set('Cookie', adminCookies);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(sampleVendorId);
    });

    it('Procurement Officer: ALLOWED (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/vendors/${sampleVendorId}`)
        .set('Cookie', officerCookies);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(sampleVendorId);
    });

    it('Manager / Approver: ALLOWED (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/vendors/${sampleVendorId}`)
        .set('Cookie', managerCookies);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(sampleVendorId);
    });

    it('Vendor: FORBIDDEN (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/vendors/${sampleVendorId}`)
        .set('Cookie', vendorCookies);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Anonymous: UNAUTHENTICATED (401)', async () => {
      const res = await request(app).get(`/api/v1/vendors/${sampleVendorId}`);
      expect(res.status).toBe(401);
    });
  });

  // 3. CREATE VENDOR (POST /api/v1/vendors)
  describe('POST /api/v1/vendors (vendor:create)', () => {
    const validVendorPayload = (gstSuffix: string) => ({
      name: `Matrix Test Vendor ${gstSuffix}`,
      category: 'IT Hardware',
      gstNumber: `29AAACP${gstSuffix}A1Z1`,
      contactName: 'Matrix Contact',
      contactEmail: `matrix${gstSuffix}@test.com`,
      contactPhone: '+919876543299',
      status: 'PENDING',
    });

    it('Admin: ALLOWED (201)', async () => {
      const res = await request(app)
        .post('/api/v1/vendors')
        .set(CSRF_HEADER)
        .set('Cookie', adminCookies)
        .send(validVendorPayload('1111'));
      expect(res.status).toBe(201);
      expect(res.body.data.gstNumber).toBe('29AAACP1111A1Z1');
    });

    it('Procurement Officer: ALLOWED (201)', async () => {
      const res = await request(app)
        .post('/api/v1/vendors')
        .set(CSRF_HEADER)
        .set('Cookie', officerCookies)
        .send(validVendorPayload('2222'));
      expect(res.status).toBe(201);
      expect(res.body.data.gstNumber).toBe('29AAACP2222A1Z1');
    });

    it('Manager / Approver: FORBIDDEN (403)', async () => {
      const res = await request(app)
        .post('/api/v1/vendors')
        .set(CSRF_HEADER)
        .set('Cookie', managerCookies)
        .send(validVendorPayload('3333'));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Vendor: FORBIDDEN (403)', async () => {
      const res = await request(app)
        .post('/api/v1/vendors')
        .set(CSRF_HEADER)
        .set('Cookie', vendorCookies)
        .send(validVendorPayload('4444'));
      expect(res.status).toBe(403);
    });

    it('Anonymous: UNAUTHENTICATED (401)', async () => {
      const res = await request(app)
        .post('/api/v1/vendors')
        .set(CSRF_HEADER)
        .send(validVendorPayload('5555'));
      expect(res.status).toBe(401);
    });
  });

  // 4. UPDATE VENDOR (PATCH /api/v1/vendors/:id)
  describe('PATCH /api/v1/vendors/:id (vendor:update)', () => {
    it('Admin: ALLOWED (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/vendors/${sampleVendorId}`)
        .set(CSRF_HEADER)
        .set('Cookie', adminCookies)
        .send({ notes: 'Updated by Admin' });
      expect(res.status).toBe(200);
      expect(res.body.data.notes).toBe('Updated by Admin');
    });

    it('Procurement Officer: ALLOWED (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/vendors/${sampleVendorId}`)
        .set(CSRF_HEADER)
        .set('Cookie', officerCookies)
        .send({ notes: 'Updated by Procurement Officer' });
      expect(res.status).toBe(200);
      expect(res.body.data.notes).toBe('Updated by Procurement Officer');
    });

    it('Manager / Approver: FORBIDDEN (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/vendors/${sampleVendorId}`)
        .set(CSRF_HEADER)
        .set('Cookie', managerCookies)
        .send({ notes: 'Manager attempt' });
      expect(res.status).toBe(403);
    });

    it('Vendor: FORBIDDEN (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/vendors/${sampleVendorId}`)
        .set(CSRF_HEADER)
        .set('Cookie', vendorCookies)
        .send({ notes: 'Vendor attempt' });
      expect(res.status).toBe(403);
    });

    it('Anonymous: UNAUTHENTICATED (401)', async () => {
      const res = await request(app)
        .patch(`/api/v1/vendors/${sampleVendorId}`)
        .set(CSRF_HEADER)
        .send({ notes: 'Anon attempt' });
      expect(res.status).toBe(401);
    });
  });

  // 5. DELETE VENDOR (DELETE /api/v1/vendors/:id)
  describe('DELETE /api/v1/vendors/:id (vendor:delete)', () => {
    let vendorToDeleteId: string;

    beforeAll(async () => {
      // Create a temporary vendor to test deletion
      const temp = await prisma.vendor.create({
        data: {
          name: 'Temp Vendor For Delete Test',
          category: 'Other',
          gstNumber: '29AAACT9999Z1Z5',
          contactName: 'Temp Contact',
          contactEmail: 'temp@test.com',
          contactPhone: '+919999999999',
          createdById: (await prisma.user.findFirst({ where: { role: 'ADMIN' } }))!.id,
        },
      });
      vendorToDeleteId = temp.id;
    });

    it('Procurement Officer: FORBIDDEN (403) — cannot hard/soft delete', async () => {
      const res = await request(app)
        .delete(`/api/v1/vendors/${vendorToDeleteId}`)
        .set(CSRF_HEADER)
        .set('Cookie', officerCookies);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Manager / Approver: FORBIDDEN (403)', async () => {
      const res = await request(app)
        .delete(`/api/v1/vendors/${vendorToDeleteId}`)
        .set(CSRF_HEADER)
        .set('Cookie', managerCookies);
      expect(res.status).toBe(403);
    });

    it('Vendor: FORBIDDEN (403)', async () => {
      const res = await request(app)
        .delete(`/api/v1/vendors/${vendorToDeleteId}`)
        .set(CSRF_HEADER)
        .set('Cookie', vendorCookies);
      expect(res.status).toBe(403);
    });

    it('Anonymous: UNAUTHENTICATED (401)', async () => {
      const res = await request(app)
        .delete(`/api/v1/vendors/${vendorToDeleteId}`)
        .set(CSRF_HEADER);
      expect(res.status).toBe(401);
    });

    it('Admin: ALLOWED (200) — successfully soft deletes vendor', async () => {
      const res = await request(app)
        .delete(`/api/v1/vendors/${vendorToDeleteId}`)
        .set(CSRF_HEADER)
        .set('Cookie', adminCookies);
      expect(res.status).toBe(200);

      // Verify soft deletion in DB
      const softDeleted = await prisma.vendor.findUnique({
        where: { id: vendorToDeleteId },
      });
      expect(softDeleted!.deletedAt).not.toBeNull();
    });
  });

  afterAll(async () => {
    await prisma.vendor.deleteMany({
      where: { contactName: 'Matrix Contact' },
    });
  });
});
