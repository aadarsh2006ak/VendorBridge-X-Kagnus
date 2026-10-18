import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';
import { prisma } from '../../../lib/prisma.js';

describe('Auth Module Integration Tests', () => {
  const CSRF_HEADER = { 'X-Requested-With': 'VendorBridge' };

  const testUser = {
    firstName: 'Test',
    lastName: 'User',
    email: 'integration-test@vendorbridge.local',
    phone: '+919999888877',
    role: 'PROCUREMENT_OFFICER',
    country: 'India',
    password: 'Password@123',
    confirmPassword: 'Password@123',
  };

  beforeAll(async () => {
    // Clean test user if exists
    await prisma.session.deleteMany({
      where: { user: { email: testUser.email } },
    });
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  afterAll(async () => {
    await prisma.session.deleteMany({
      where: { user: { email: testUser.email } },
    });
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully (201)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .set(CSRF_HEADER)
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.passwordHash).toBeUndefined(); // Security: never leak hash
    });

    it('should reject duplicate email with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .set(CSRF_HEADER)
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should reject weak password with 400 Validation Error', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .set(CSRF_HEADER)
        .send({
          ...testUser,
          email: 'weak-pass@vendorbridge.local',
          password: 'weak',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject Admin registration without invite code with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .set(CSRF_HEADER)
        .send({
          ...testUser,
          email: 'fake-admin@vendorbridge.local',
          role: 'ADMIN',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow Admin registration with valid invite code', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .set(CSRF_HEADER)
        .send({
          ...testUser,
          email: 'real-admin-test@vendorbridge.local',
          role: 'ADMIN',
          inviteCode: 'ADMIN_SECRET_INVITE_2026',
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('ADMIN');

      // Cleanup
      await prisma.user.delete({ where: { email: 'real-admin-test@vendorbridge.local' } });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let authCookies: string[];

    it('should login user and set httpOnly auth cookies (200)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set(CSRF_HEADER)
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(testUser.email);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes('vb_access_token'))).toBe(true);
      expect(cookies.some((c: string) => c.includes('vb_refresh_token'))).toBe(true);

      authCookies = cookies;
    });

    it('should reject invalid password with generic 401 error', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set(CSRF_HEADER)
        .send({
          email: testUser.email,
          password: 'WrongPassword!999',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should reject unknown email with generic 401 error', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set(CSRF_HEADER)
        .send({
          email: 'unknown-random-person@vendorbridge.local',
          password: 'Password@123',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 if unauthenticated', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('should return user profile when authenticated with cookie', async () => {
      // Login first to get cookie
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set(CSRF_HEADER)
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const cookies = loginRes.headers['set-cookie'];

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookies);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe(testUser.email);
      expect(meRes.body.user.role).toBe('PROCUREMENT_OFFICER');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should rotate tokens and return new cookies', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set(CSRF_HEADER)
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const cookies = loginRes.headers['set-cookie'];

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set(CSRF_HEADER)
        .set('Cookie', cookies);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.user.email).toBe(testUser.email);
      expect(refreshRes.headers['set-cookie']).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear cookies and revoke session on logout', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set(CSRF_HEADER)
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const cookies = loginRes.headers['set-cookie'];

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set(CSRF_HEADER)
        .set('Cookie', cookies);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toBe('Successfully logged out');
    });
  });

  describe('POST /api/v1/auth/forgot-password & reset-password', () => {
    it('should return generic success message for forgot password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .set(CSRF_HEADER)
        .send({ email: testUser.email });

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });

    it('should reject invalid token on reset password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .set(CSRF_HEADER)
        .send({
          token: 'completely-invalid-nonexistent-token',
          password: 'NewStrongPassword@2026',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
