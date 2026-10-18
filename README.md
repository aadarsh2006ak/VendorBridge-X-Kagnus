# VendorBridge — Procurement & Vendor Management ERP
> **Week 1 Milestone:** Foundation, Authentication, Role-Aware Dashboard & Vendor Management  
> **Repository:** `VendorBridge-X-Kagnus`  
> **Source of Truth:** VendorBridge 11-Screen Excalidraw Specification

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2d3748.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2F18-336791.svg)](https://www.postgresql.org/)
[![Tests](https://img.shields.io/badge/Vitest-46%20passed-brightgreen.svg)](https://vitest.dev/)

---

## 1. Executive Summary

**VendorBridge** is an enterprise-grade Procurement & Vendor Management ERP designed to streamline the entire source-to-pay lifecycle: from vendor onboarding, RFQs, and competitive quotations, through manager approvals, purchase orders, 3-way matching invoices, and analytical audit logs.

### Week 1 Deliverables Overview:
1. **Deliverable 1: Authentication & Authorization (RBAC)**
   - Argon2id password hashing + JWT access token (15m) + rotating refresh token (7d) stored in secure `httpOnly`, `SameSite=Lax` cookies.
   - Server-enforced Role-Based Access Control matrix across four roles: `ADMIN`, `PROCUREMENT_OFFICER`, `MANAGER`, and `VENDOR`.
   - Admin registration safeguard (`ADMIN_INVITE_CODE`), rate limiting, CSRF header checks, session revocation, and forgot/reset password flow.
2. **Deliverable 2: Role-Aware Dashboard (Screen 3)**
   - 4 live StatCards (`Total Vendors`, `Active Vendors`, `Pending Approval`, `Blocked Vendors`) queried from the database.
   - Quick action shortcuts (permission-aware "+ Add Vendor" modal, "View Vendors", "Review Pending").
   - Honest, informative empty states for future modules scheduled for Weeks 2–4 (Purchase Orders, Spending Analytics).
3. **Deliverable 3: Complete Vendor Management (Screen 4)**
   - Full CRUD: Create, View (side drawer), Update (modal), and Soft-Delete (Admin-only confirmation dialog).
   - Case-insensitive search across legal name, trade name, GSTIN, and contact details.
   - Status filter chips with real-time database counts (`All`, `Active`, `Pending`, `Blocked`) and category dropdown filters.
   - Strict 15-character uppercase Indian GSTIN validation regex with uniqueness enforcement in PostgreSQL.
   - **Zero fake features**: All vendor data is persisted in PostgreSQL and survives page refreshes, hard reloads, and server restarts.

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite, TypeScript | Fast reactive SPA with strict type safety |
| **Styling** | Vanilla Tailwind CSS (Custom Dark Theme Tokens) | Exact visual match to dark Excalidraw mockup with `#0B0D0C` canvas and emerald `#15803D` accents |
| **Data Fetching** | TanStack Query v5 + Axios | Automatic caching, query invalidation, background refetching, and 401 refresh interceptor |
| **Form Handling** | React Hook Form + Zod | Schema-driven client validation matching backend DTO schemas |
| **Routing** | React Router v6 | Protected routes, role guards, nested layouts |
| **Backend API** | Node.js 20+, Express, TypeScript | Modular REST API with centralized error handling |
| **Database & ORM** | PostgreSQL (v16/18) + Prisma ORM | Relational persistence, migrations, and partial unique index on `gstNumber` |
| **Auth & Security** | Argon2id, JWT, httpOnly Cookies, Helmet, Rate-Limit | Secure session handling without exposing tokens to JavaScript |
| **Audit Log** | Prisma insert-only `AuditLog` service | Forensic traceability for all vendor CRUD events |
| **Testing** | Vitest, Supertest | 46 integration tests including complete 25-cell RBAC matrix |

---

## 3. Architecture & Role-Based Access Matrix

```
                    ┌─────────────────────────┐
                    │ React 18 + Vite Client  │
                    │  (Port 5173 / 5174)     │
                    └────────────┬────────────┘
                                 │ HTTP / httpOnly Cookies
                                 ▼
                    ┌─────────────────────────┐
                    │ Express TypeScript API  │
                    │       (Port 4000)       │
                    └────────────┬────────────┘
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Auth Middleware │    │ RBAC Permissions │    │ Central Error    │
│  & Cookie Parser │    │   Enforcement    │    │ & Audit Service  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  Prisma ORM Client      │
                    └────────────┬────────────┘
                                 │ SQL Connection Pool
                                 ▼
                    ┌─────────────────────────┐
                    │ PostgreSQL Database     │
                    │ (Tables: User, Session, │
                    │  Vendor, AuditLog)      │
                    └─────────────────────────┘
```

### Role-Based Access Control (RBAC) Matrix

| Endpoint | Action | Admin | Procurement Officer | Manager | Vendor | Anonymous |
|---|---|:---:|:---:|:---:|:---:|:---:|
| `GET /api/v1/auth/me` | Current Profile | 200 | 200 | 200 | 200 | 401 |
| `GET /api/v1/dashboard/summary` | Dashboard Stats | 200 | 200 | 200 | 200 | 401 |
| `GET /api/v1/vendors` | List Vendors | 200 | 200 | 200 | **403** | 401 |
| `GET /api/v1/vendors/:id` | View Vendor Detail | 200 | 200 | 200 | **403** | 401 |
| `POST /api/v1/vendors` | Create Vendor | 201 | 201 | **403** | **403** | 401 |
| `PATCH /api/v1/vendors/:id` | Update Vendor | 200 | 200 | **403** | **403** | 401 |
| `DELETE /api/v1/vendors/:id` | Soft Delete Vendor | 200 | **403** | **403** | **403** | 401 |

> **Backend Authority Note:** Every single permission check is enforced by Express middleware on the backend. Frontend hiding of buttons is purely for clean user experience.

---

## 4. Demo Credentials

The database is pre-seeded with 4 distinct user accounts (1 per role) and 25 realistic vendors across all statuses (`ACTIVE`, `PENDING`, `BLOCKED`).

| Role | Email Address | Password | Permissions & Scope |
|---|---|---|---|
| **Admin** | `admin@vendorbridge.local` | `Password@123` | Full system access: vendor create, read, update, delete, audit logs. |
| **Procurement Officer** | `officer@vendorbridge.local` | `Password@123` | Operational access: create, read, and edit vendors. Cannot delete. |
| **Manager** | `manager@vendorbridge.local` | `Password@123` | Supervisory read-only: view dashboard, inspect vendors. Cannot create, edit, or delete. |
| **Vendor** | `vendor@acme.local` | `Password@123` | External partner: restricted from internal vendor registry (returns 403 Forbidden). |

*(For testing admin registration via UI, use Admin Invite Code: `VENDORBRIDGE_ADMIN_SECRET_2026`)*

---

## 5. Prerequisites & Environment Setup

### Prerequisites
- **Node.js**: v20.x or v22.x+
- **npm**: v10.x+
- **PostgreSQL**: v16+ (or Docker Engine)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/VendorBridge-X-Kagnus.git
cd VendorBridge-X-Kagnus
```

### 2. Environment Variables Configuration

Copy `.env.example` in both `server/` and `client/`:

**Server (`server/.env`):**
```env
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# PostgreSQL Connection String
DATABASE_URL=postgresql://postgres:aadarsh2006@localhost:5432/vendorbridge?schema=public

# Secrets
JWT_ACCESS_SECRET=super_secret_access_jwt_key_32chars_long_xyz
JWT_REFRESH_SECRET=super_secret_refresh_jwt_key_32chars_long_abc
COOKIE_SECRET=super_secret_cookie_signing_key_32chars_long_123
ADMIN_INVITE_CODE=VENDORBRIDGE_ADMIN_SECRET_2026

# SMTP for Password Reset (Ethereal test credentials)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=ethereal_user
SMTP_PASS=ethereal_pass
SMTP_FROM="VendorBridge ERP <no-reply@vendorbridge.local>"
```

**Client (`client/.env`):**
```env
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

---

## 6. Database Setup, Migration & Seed

Run from the root or `server/` folder:

```bash
# 1. Install dependencies
npm install

# 2. Apply Prisma schema migration
cd server
npx prisma migrate dev --name init

# 3. Seed demo users & 25 vendors
npm run db:seed
```

---

## 7. Running the Application

### Development Mode (Both Frontend & Backend)

**Terminal 1 — Backend API (Port 4000):**
```bash
cd server
npm run dev
# Starts API with tsx watch on http://localhost:4000
```

**Terminal 2 — Frontend Client (Port 5173 / 5174):**
```bash
cd client
npm run dev
# Starts Vite dev server on http://localhost:5173 (or 5174)
```

Visit **`http://localhost:5173`** (or `http://localhost:5174`) in your browser.

### Production Build Validation
```bash
# Build backend
cd server && npm run build

# Build frontend
cd ../client && npm run build
```
Both builds compile with **0 errors and 0 warnings**.

---

## 8. Automated Testing

Run the automated integration test suite from `server/`:

```bash
cd server
npm test
```

### Test Results Summary:
```
 ✓ src/modules/vendors/__tests__/vendor-features.test.ts (7 tests)
 ✓ src/modules/vendors/__tests__/vendor-rbac-matrix.test.ts (25 tests)
 ✓ src/modules/auth/__tests__/auth.test.ts (14 tests)

 Test Files  3 passed (3)
      Tests  46 passed (46)
   Duration  3.83s
```

All 46 integration tests pass, including:
- **14 Auth tests**: registration, argon2 password hashing, session cookies, JWT token rotation, reuse breach revocation, rate limiting.
- **25 RBAC Matrix tests**: every role (`Admin`, `Officer`, `Manager`, `Vendor`, `Anonymous`) tested against all vendor endpoints with exact 200/201/403/401 status checks.
- **7 Vendor Feature tests**: search by name & GSTIN, category filtering, pagination metadata, status chip counts preservation, and soft deletion.

---

## 9. Demonstrable Evidence & Screenshots

> 📺 **Demonstration Video Walkthrough:** [Watch Video Demonstration on LinkedIn](https://lnkd.in/p/dVGWVpez)  
> 📁 **Screenshot Repository Gallery:** [`docs/screenshots/`](docs/screenshots/)

All high-resolution demonstration screenshots are stored in [`docs/screenshots/`](docs/screenshots/):

| Screenshot | Description | Preview |
|---|---|:---:|
| **01 - Login Screen** | Sleek dark theme with brand mark, validation, and 1-click demo accounts | <img src="docs/screenshots/01-login.png" width="280" alt="Login Screen" /> |
| **02 - Dashboard Shell** | Real greeting, 4 live database StatCards, PO & Spend empty states | <img src="docs/screenshots/02-dashboard.png" width="280" alt="Dashboard Screen" /> |
| **03 - Vendor Management** | Full 6-column data table, search bar, category filter, status chips | <img src="docs/screenshots/03-vendors-list.png" width="280" alt="Vendors Table" /> |
| **04 - Add Vendor Modal** | Zod-validated modal form with Indian GSTIN and phone validation | <img src="docs/screenshots/04-add-vendor-modal.png" width="280" alt="Add Vendor Modal" /> |
| **05 - Filtered Vendors** | Instant filtering by "Pending" status chip with updated count chips | <img src="docs/screenshots/05-vendors-filtered.png" width="280" alt="Filtered Vendors" /> |
| **06 - Created Vendor** | New vendor created and persisted in PostgreSQL database | <img src="docs/screenshots/06-vendor-created.png" width="280" alt="Created Vendor" /> |

---

## 10. Repository Structure

```
VendorBridge-X-Kagnus/
├── docker-compose.yml          # PostgreSQL 16 container definition
├── LICENSE                     # MIT License
├── README.md                   # Complete documentation and setup guide
├── package.json                # Root package with unified workspace scripts
├── docs/                       # Canonical specifications & reports
│   ├── prd.md                  # Product Requirements Document
│   ├── architecture.md         # Technical architecture & data models
│   ├── rules.md                # Golden engineering rules
│   ├── design.md               # Design specification & color tokens
│   ├── tasks.md                # 10-phase milestone task plan
│   ├── memory.md               # Architecture decision log & running state
│   ├── completion-report.md    # Week 1 Completion & Acceptance Report
│   └── screenshots/            # Demonstration screenshots
├── client/                     # Frontend SPA (React 18 + Vite + TS + Tailwind)
│   ├── src/
│   │   ├── components/         # UI kit (Modal, Drawer, StatCard, Badge, etc.)
│   │   ├── context/            # AuthContext & session management
│   │   ├── lib/                # Axios instance, queryClient, helpers
│   │   ├── pages/              # Auth, Dashboard, Vendors, & ComingSoon views
│   │   └── App.tsx             # Route definitions with role guards
│   ├── tailwind.config.js      # Custom dark theme color tokens
│   └── package.json
└── server/                     # Backend API (Express + TypeScript + Prisma)
    ├── prisma/
    │   ├── schema.prisma       # User, Session, Vendor, AuditLog models
    │   └── seed.ts             # 4 demo users + 25 realistic vendors
    ├── src/
    │   ├── modules/
    │   │   ├── auth/           # Login, register, refresh, reset + tests
    │   │   ├── vendors/        # CRUD, search, filter + RBAC matrix tests
    │   │   ├── dashboard/      # Dashboard summary endpoint
    │   │   └── audit/          # Write-only forensic audit log service
    │   ├── middleware/         # Auth, RBAC authorize, validation, CSRF, rate-limit
    │   ├── lib/                # Prisma client, argon2, tokens, errors
    │   ├── app.ts              # Express configuration & routes
    │   └── server.ts           # Server bootstrap
    └── package.json
```

---

## 11. Milestone Acceptance Checklist

- [x] **Deliverable 1: Authentication**
  - [x] User can register with role validation (Admin invite code required for Admin).
  - [x] User can log in with email/password; receives `httpOnly` secure cookies.
  - [x] Session refresh with rotation and breach detection.
  - [x] User can log out; cookies cleared and session deleted in PostgreSQL.
  - [x] Protected routes redirect unauthenticated users to `/login`.
  - [x] Unauthorized roles blocked on backend (`403 Forbidden` verified via 25-cell test matrix).
- [x] **Deliverable 2: Dashboard**
  - [x] Matches 11-screen Excalidraw design reference (dark theme, green active nav).
  - [x] 4 StatCards with live counts from database.
  - [x] Navigation with all 11 modules.
  - [x] Quick actions ("+ Add Vendor", "View Vendors").
  - [x] Honest empty states for future modules (Purchase Orders, Spending Analytics).
- [x] **Deliverable 3: Vendor Management**
  - [x] Create vendor with 15-char Indian GSTIN and phone validation.
  - [x] View vendor side drawer with complete metadata.
  - [x] Update vendor modal with prefilled data.
  - [x] Soft-delete vendor (Admin only, confirmation dialog).
  - [x] Case-insensitive search across name and GSTIN.
  - [x] Status filter chips with live counts + Category dropdown filter.
  - [x] Data persists in PostgreSQL after page refresh and server restart.

---

*VendorBridge is developed for the 4-week Full Stack ERP Internship Milestone.*
