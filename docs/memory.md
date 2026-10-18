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
- **Current Phase:** Phase 2 — Backend Authentication
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
- **Active Task:**
  - [ ] **2.1** Utilities: argon2 hashing, token generation/hashing, JWT sign/verify, cookie helpers
