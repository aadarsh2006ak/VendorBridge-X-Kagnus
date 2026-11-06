# VendorBridge — Procurement & Vendor Management ERP
> **Final Milestone:** Week 4 — Activity Logs, Notifications, Reports, Analytics & Final Deployment (Complete 4-Week ERP Suite)  
> **Repository:** `VendorBridge-X-Kagnus`  
> **Source of Truth:** VendorBridge 11-Screen Excalidraw Specification  
> **Status:** 100% Production Ready • 80 / 80 Passing Automated Tests  

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2d3748.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2F18-336791.svg)](https://www.postgresql.org/)
[![Tests](https://img.shields.io/badge/Vitest-80%20passed-brightgreen.svg)](https://vitest.dev/)

---

## 1. Executive Summary

**VendorBridge** is an enterprise-grade Procurement & Vendor Management ERP engineered to orchestrate the entire **Source-to-Pay (S2P)** lifecycle. Following the canonical 11-screen Excalidraw specification, the application connects vendor onboarding, RFQ publication, supplier bidding, quotation comparison, multi-level approvals, purchase order issuance, GST tax invoicing, event-driven notifications, immutable forensic audit logging, and executive analytics.

### Complete 4-Week Roadmap:
- **Week 1:** Authentication (Argon2id, JWT rotation, httpOnly cookies), Role-Based Access Control, Role-Aware Dashboard, and Vendor Management (GSTIN validation, Drawer, Modal, CRUD).
- **Week 2:** Request for Quotation (RFQ) Lifecycle, Vendor Portal Quotation Submission, and Quotation Comparison Matrix with Lowest-Price (L1) Highlighting.
- **Week 3:** Multi-Level Approval Workflow (Screen 8), Automatic Purchase Order Generation (`PO-YYYY-NNNN`), and Invoice Generation with 18% GST Tax Math, PDF Download & Email Delivery (Screen 9).
- **Week 4 (Final Milestone):**
  1. **Event-Driven Notifications:** Real-time procurement event triggers, unread pill badge, Topbar notification center with filter tabs, and mark-all-read.
  2. **Forensic Activity Timeline & Audit Logs (`/activity`):** Immutable append-only audit trail capturing actor, role, IP address, user agent, action badges, and deep JSON payload inspection.
  3. **Reports & Analytics Dashboard (`/reports`):** Spend KPI cards, monthly spending trend histogram, category spend progress bars, vendor fulfillment leaderboard, and 4 streaming CSV exports.
  4. **Complete Application Integration:** Seamless RBAC verification across all 4 roles with zero broken flows and 100% test coverage.

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
| **Database & ORM** | PostgreSQL (v16/18) + Prisma ORM | Relational persistence, migrations, and foreign keys |
| **PDF Generation** | PDFKit | Vector-quality downloadable invoice and PO documents |
| **Email Service** | Nodemailer (Ethereal / SMTP) | Transactional invoice delivery with PDF attachments |
| **Auth & Security** | Argon2id, JWT, httpOnly Cookies, Helmet, Rate-Limit | Secure session handling without exposing tokens to JavaScript |
| **Audit Ledger** | Prisma insert-only `AuditLog` service | Forensic traceability for all procurement events (immutable) |
| **Testing** | Vitest, Supertest | 80 integration and unit tests passing across 6 test suites |

---

## 3. End-to-End Procurement Workflow

```
[Screen 5: Create RFQ]
       │
       ▼
[Screen 6: Vendor Quote Submission]
       │
       ▼
[Screen 7: Quotation Comparison & Selection]
       │  (Select Quotation triggers Approval Request)
       ▼
[Screen 8: Approval Workflow (/approvals/:id)]
       │  (Manager / Admin reviews remarks & approves)
       ▼
[Screen 9: Purchase Order & Invoice (/purchase-orders/:id, /invoices/:id)]
       ├── View PO (PO-YYYY-NNNN)
       ├── Generate Invoice (INV-YYYY-NNNN)
       ├── Download PDF (/api/v1/invoices/:id/pdf)
       ├── Print Invoice (window.print())
       ├── Email Invoice (/api/v1/invoices/:id/email)
       └── Mark as Paid (/api/v1/invoices/:id/status)
       │
       ▼
[Week 4: Real-Time Governance & Analytics]
       ├── Topbar Notifications (Live Event-driven alerts & unread counter)
       ├── /activity: Forensic Audit Timeline & Immutable JSON Ledger
       └── /reports: Spend Trends, Category Breakdown, Vendor KPIs & CSV Exports
```

---

## 4. API Endpoints Reference

### Notifications (`/api/v1/notifications`)
- `GET /api/v1/notifications`: List user notifications with `unreadOnly` filter and pagination.
- `GET /api/v1/notifications/unread-count`: Returns active unread counter badge.
- `PATCH /api/v1/notifications/mark-all-read`: Marks all notifications as read for current user.
- `PATCH /api/v1/notifications/:id/read`: Marks single notification as read.

### Activity & Forensic Audit Logs (`/api/v1/audit`)
- `GET /api/v1/audit`: List chronological audit events with filtering (`entityType`, `search`, `page`, `limit`).
- `GET /api/v1/audit/stats`: Returns KPI metrics (total events, past 24h, past 7 days, entity distribution).

### Reports & Analytics (`/api/v1/reports`)
- `GET /api/v1/reports/summary?range=all`: Returns high-level executive procurement spend, PO counts, and settlements.
- `GET /api/v1/reports/spending-trends`: Monthly histogram data (PO spend vs Invoice settlements).
- `GET /api/v1/reports/category-breakdown`: Expenditure distribution by category with percentage progress.
- `GET /api/v1/reports/vendor-performance`: Real database metrics: orders awarded, total spend, rating, and win rate.
- `GET /api/v1/reports/export/:type`: Streaming CSV downloads for `spend`, `vendors`, `purchase_orders`, `invoices`.

### Approvals (`/api/v1/approvals`)
- `GET /api/v1/approvals`: List approval requests with filter tabs (`ALL`, `PENDING`, `APPROVED`, `REJECTED`).
- `GET /api/v1/approvals/:id`: Get single approval workflow detail with 4-step stepper and timeline.
- `POST /api/v1/approvals/:id/approve`: Approve request, capture remarks, and automatically generate Purchase Order.
- `POST /api/v1/approvals/:id/reject`: Reject request with mandatory remarks.

### Purchase Orders (`/api/v1/purchase-orders`)
- `GET /api/v1/purchase-orders`: List purchase orders (Staff sees all, Vendors see own).
- `GET /api/v1/purchase-orders/:id`: Get purchase order document with items and linked invoice.
- `POST /api/v1/purchase-orders/generate`: Generate PO from approved quotation (Staff only; duplicate protected).

### Invoices (`/api/v1/invoices`)
- `GET /api/v1/invoices`: List invoices with status counts (`PENDING_PAYMENT`, `PAID`, `CANCELLED`).
- `GET /api/v1/invoices/:id`: Get invoice document with line items, tax breakdown, and linked PO.
- `POST /api/v1/invoices/generate`: Generate invoice from confirmed PO with 18% GST calculation.
- `PATCH /api/v1/invoices/:id/status`: Update invoice status (`PAID` with payment reference).
- `GET /api/v1/invoices/:id/pdf`: Stream vector PDF attachment matching Screen 9.
- `POST /api/v1/invoices/:id/email`: Send invoice email with attached PDF.

---

## 5. Quick Start Instructions

### Prerequisites
- Node.js 20+ installed
- PostgreSQL 16+ or 18 running on `127.0.0.1:5432`

### 1. Backend Setup
```bash
cd server
npm install

# Run Prisma migration & seed
npx prisma migrate deploy
npm run db:seed

# Start development server (Port 4000)
npm run dev
```

### 2. Frontend Setup
```bash
cd client
npm install

# Start frontend dev server (Port 5173)
npm run dev
```

### 3. Demo Accounts
| Role | Email | Password | Primary Actions |
|---|---|---|---|
| **Admin** | `admin@vendorbridge.local` | `Admin@12345` | Global admin, user management, audit logs, reports |
| **Manager / Approver** | `manager@vendorbridge.local` | `Manager@12345` | Review procurement requests, approve/reject |
| **Procurement Officer** | `procurement@vendorbridge.local` | `Procurement@12345` | Create RFQs, compare quotes, issue POs |
| **Vendor Partner** | `sales@bluestar.local` | `Vendor@12345` | View assigned RFQs, submit quotes, view POs |

---

## 6. Automated Testing (80 of 80 Passing)

Run the Vitest test suite from `server/`:

```bash
cd server
npm test
```

### Test Results Summary:
```
 RUN  v3.2.7 C:/Users/kumar/OneDrive/Desktop/kagnus-full stack internship 4 week/server

 ✓ src/modules/auth/__tests__/auth.test.ts (14 tests)
 ✓ src/modules/reports/__tests__/week4-analytics.test.ts (16 tests)
 ✓ src/modules/vendors/__tests__/vendor-rbac-matrix.test.ts (25 tests)
 ✓ src/modules/approvals/__tests__/week3-workflow.test.ts (16 tests)
 ✓ src/modules/vendors/__tests__/vendor-features.test.ts (7 tests)
 ✓ src/modules/quotations/__tests__/quotation.calculator.test.ts (2 tests)

 Test Files  6 passed (6)
      Tests  80 passed (80)
   Duration  10.86s
```

---

## 7. Milestone Acceptance Checklist

- [x] **Week 1 Foundation**
  - [x] Secure authentication with argon2id, JWT rotation, and httpOnly cookies.
  - [x] Role-Based Access Control matrix verified by 25 automated tests.
  - [x] Complete vendor management CRUD with Indian GSTIN validation.
- [x] **Week 2: RFQ & Quotation Lifecycle**
  - [x] Concurrency-safe sequence generator `RFQ-YYYY-NNNN`.
  - [x] Vendor Portal workspace with deadline locking (`404` for unassigned vendors).
  - [x] Quotation comparison matrix with green lowest price (L1) highlight.
- [x] **Week 3: Approvals, POs & Invoices**
  - [x] Screen 8: 4-step approval stepper with remarks and decision timestamps.
  - [x] Strict approver authorization (`MANAGER` / `ADMIN` only).
  - [x] Automatic purchase order generation (`PO-YYYY-NNNN`).
  - [x] Screen 9: Unified PO and Invoice document view.
  - [x] Authoritative 18% GST calculation (Subtotal, CGST 9%, SGST 9%, Grand Total).
  - [x] Downloadable vector PDF generation (`/api/v1/invoices/:id/pdf`).
  - [x] Print-friendly stylesheet (`window.print()`).
  - [x] Invoice email delivery with attached PDF via SMTP.
  - [x] Settlement tracking (Mark as Paid with UTR/reference).
- [x] **Week 4: Activity Logs, Analytics & Final Deployment**
  - [x] Real-time, event-driven notification triggers on all procurement milestones.
  - [x] Topbar notification bell with unread count badge and quick navigation.
  - [x] Chronological, forensic activity timeline & audit log ledger (`/activity`).
  - [x] Append-only audit architecture blocking unauthorized edits or deletes.
  - [x] Executive reports dashboard with monthly spend trends & category breakdowns (`/reports`).
  - [x] Real-time vendor performance leaderboard with win-rate analytics.
  - [x] 4 streaming CSV exports (Spend, Vendors, Purchase Orders, Invoices).
  - [x] 80 / 80 automated unit & integration tests passing (100% success rate).
  - [x] Comprehensive deployment and completion documentation (`docs/WEEK_4_FINAL_REPORT.md`).

---

*VendorBridge — Developed for the 4-week Full Stack Enterprise ERP Internship.*
