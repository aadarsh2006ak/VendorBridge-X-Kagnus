# VendorBridge — Project Memory & Running State

## Project Overview
- **Project Name:** VendorBridge — Procurement & Vendor Management ERP
- **Repository:** `VendorBridge-X-Kagnus`
- **Current Milestone:** Week 1 — Foundation & Vendor Management
- **Date Initialized:** 2026-10-18
- **Primary Design Reference:** VendorBridge Excalidraw Mockup (11 screens)

---

## Architectural Decisions Log

| Decision ID | Decision | Rationale | Date |
|---|---|---|---|
| DEC-001 | Full-stack Separation: `client/` (React + Vite + TS) and `server/` (Node.js + Express + TS + Prisma) | Required by PRD §6 and Architecture §1 for clean layer boundaries. | 2026-10-18 |
| DEC-002 | PostgreSQL 18 / 16 via Prisma ORM | System already has PostgreSQL service running on port 5432; docker-compose also provided for review environments. | 2026-10-18 |
| DEC-003 | Session Handling via httpOnly Cookies | Security best practice; Access token (15m) + Rotating Refresh Token (7d) stored hashed with SHA-256. | 2026-10-18 |
| DEC-004 | CSRF Protection via SameSite=Lax + Custom Header | Requests mutating state require `X-Requested-With: VendorBridge`. | 2026-10-18 |
| DEC-005 | Password Hashing: Argon2id | Industry gold standard matching architecture specifications. | 2026-10-18 |
| DEC-006 | Admin Registration Safeguard | Admin role requires valid `ADMIN_INVITE_CODE` in server environment. | 2026-10-18 |
| DEC-007 | Immutable Write-Only AuditLog | AuditLog table has no update/delete queries to preserve forensic audit integrity for Week 4. | 2026-10-18 |

---

## Deviations from Wireframe (Approved in PRD §9)
1. Login uses **Email** instead of generic Username to match email/password standard.
2. Registration includes **Password** and **Confirm Password** fields.
3. Registration allows Admin role selection only with valid **Admin Invite Code**.
4. Login includes **"Forgot password?"** link for self-service recovery.
5. Vendors table provides **Edit** and **Delete** actions in the Action column / detail drawer (role-dependent).
6. "Photo" placeholders on auth screens replaced with sleek **VendorBridge** brand mark.

---

## Current Task Status
- **Current Phase:** Phase 4 — Frontend Foundation
- **Completed Tasks:**
  - [x] **0.1** Create GitHub repo, `.gitignore`, MIT license, branch `main`
  - [x] **0.2** Create `docs/` and add all 6 canonical documentation files (`prd.md`, `architecture.md`, `rules.md`, `design.md`, `tasks.md`, `memory.md`)
  - [x] **0.3** Scaffold `server/` (Express + TS, tsx, ESLint, Prettier)
  - [x] **0.4** Scaffold `client/` (Vite + React + TS, Tailwind, React Router, TanStack Query)
  - [x] **0.5** `docker-compose.yml` with PostgreSQL; `.env.example` files for root/server/client
  - [x] **0.6** Root `package.json` with unified scripts (`dev`, `build`, `lint`, `test`, `db:migrate`, `db:seed`)
  - [x] **0.7** Env parsing with Zod; `/api/v1/health` endpoint including PostgreSQL DB check (tested & passed)
  - [x] **1.1** Prisma schema: `User`, `Session`, `PasswordResetToken`, `Vendor`, `AuditLog`, enums
  - [x] **1.2** Initial migration applied with partial unique index on `Vendor.gstNumber` where `deletedAt IS NULL`
  - [x] **1.3** Seed script populated 4 demo accounts (Admin, Procurement Officer, Manager, Vendor) and 25 realistic vendors across all statuses and categories
  - [x] **1.4** Prisma client singleton & insert-only AuditLog service created
  - [x] **2.1** Utilities: argon2id password hashing, token generation, SHA-256 token hashing, JWT sign/verify, cookie helpers
  - [x] **2.2** Zod schemas: register, login, forgot, reset with strict mode
  - [x] **2.3** `POST /api/v1/auth/register` (duplicate email 409, Admin invite-code check, password policy)
  - [x] **2.4** `POST /api/v1/auth/login` (generic error, session row in DB, httpOnly cookies, audit log)
  - [x] **2.5** `POST /api/v1/auth/refresh` (rotation and token reuse breach detection revoking all sessions)
  - [x] **2.6** `POST /api/v1/auth/logout` and `GET /api/v1/auth/me`
  - [x] **2.7** `POST /api/v1/auth/forgot-password` with Nodemailer and generic non-enumerating response
  - [x] **2.8** `POST /api/v1/auth/reset-password` (consumes token, updates hash, revokes all active sessions)
  - [x] **2.9** Middleware: `authenticate`, `authorize(permission)`, `validate`, `rateLimit`, `errorHandler`, `csrfProtection`
  - [x] **2.10** `permissions.ts` RBAC map and typed `AppError` subclasses
  - [x] **2.11** 14/14 Auth integration tests passing with Vitest
  - [x] **3.1** Vendor Zod schemas: create, update, list query with 15-char Indian GST regex
  - [x] **3.2** `GET /api/v1/vendors` with debounced search, status & category filters, pagination, and dynamic status chip counts
  - [x] **3.3** `GET /api/v1/vendors/:id` detail with creator metadata
  - [x] **3.4** `POST /api/v1/vendors` with GST uniqueness enforcement (409 Conflict)
  - [x] **3.5** `PATCH /api/v1/vendors/:id` with partial update & audit logging
  - [x] **3.6** `DELETE /api/v1/vendors/:id` soft delete (`deletedAt`)
  - [x] **3.7** `GET /api/v1/dashboard/summary` contract for future weeks
  - [x] **3.8** Write-only AuditLog entries for all vendor CRUD events
  - [x] **3.9** **Role × Endpoint Matrix Test (25/25 matrix cells verified passing)**
  - [x] **3.10** 46/46 Backend integration tests green
  - [x] **4.1 - 4.7** Frontend foundation: Tailwind tokens, full UI kit, Axios interceptors, AuthContext, AppShell, responsive sidebar, route guards, ComingSoon modules
  - [x] **5.1 - 5.5** Auth screens: Login, Register with Admin invite-code protection, Forgot Password, Reset Password
  - [x] **6.1 - 6.7** Role-aware Dashboard: user greeting, 4 live database StatCards, PO and Spend analytics empty states, quick actions
  - [x] **7.1 - 7.9** Vendor management UI: DataTable, search, category filter, status filter chips with real-time counts, Create/Edit modal, View drawer, Delete dialog, PostgreSQL persistence across reloads
  - [x] **8.1 - 8.5** Quality & Hardening: 46/46 tests green, production client build passes cleanly (0 errors), security headers, CSRF headers, rate limiting
  - [x] **9.1 - 9.5** Submission Package: root README.md, completion-report.md, docs/screenshots/, demo credentials, git commit & tag week-1
- **Current Milestone Status:**
  - **Week 1 Milestone Complete & Demonstrable.**

