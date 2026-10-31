# VendorBridge — Procurement & Vendor Management ERP
> **Current Milestone:** Week 3 — Approval Workflow, Purchase Orders & Invoices (Integrated with Weeks 1 & 2)  
> **Repository:** `VendorBridge-X-Kagnus`  
> **Source of Truth:** VendorBridge 11-Screen Excalidraw Specification

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2d3748.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2F18-336791.svg)](https://www.postgresql.org/)
[![Tests](https://img.shields.io/badge/Vitest-64%20passed-brightgreen.svg)](https://vitest.dev/)

---

## 1. Executive Summary

**VendorBridge** is an enterprise-grade Procurement & Vendor Management ERP designed to streamline the entire source-to-pay lifecycle. Following the canonical 11-screen Excalidraw specification, the project is structured into 4 sequential milestone weeks:

- **Week 1:** Authentication, Role-Based Access Control, Role-Aware Dashboard, and Complete Vendor Management.
- **Week 2:** Request for Quotation (RFQ) Lifecycle, Vendor Portal Quotation Submission, and Quotation Comparison Matrix with Lowest-Price Highlighting.
- **Week 3 (Completed):** Multi-Level Approval Workflow (Screen 8), Automatic Purchase Order Generation, and Invoice Generation with Tax Math, PDF Download & Email Delivery (Screen 9).
- **Week 4:** 3-Way Matching, Analytics & Activity Audit Reports.

### Week 3 Deliverables:
1. **Approval Workflow (Screen 8):**
   - Displays procurement requests from quotations selected in Week 2.
   - 4-step linear approval stepper: `Submitted → L1 Review → L2 approval → Generate PO`.
   - Approval chain cards explicitly tracking approvers (`Rahul Mehta`, `Priya Shah`), timestamps, and remarks.
   - Strict RBAC: Only authorized managers (`MANAGER`, `ADMIN`) can approve or reject. Unauthorized users receive `403 Forbidden`.
   - Persists remarks, decision timestamps, and approval audit history in PostgreSQL.
2. **Purchase Order Generation (Screen 9):**
   - Generates official POs exclusively from `APPROVED` quotations.
   - Concurrency-safe, collision-free human-readable sequence `PO-YYYY-NNNN` via PostgreSQL `Counter`.
   - Populates vendor details, line items, quantities, unit prices, delivery terms, and GST breakdown.
   - Maintains immutable links to source Quotation, RFQ, and Approval record.
   - Duplicate prevention enforced at database schema level via `@unique` on `quotationId`.
   - Object-level security: Vendors can only view their own purchase orders (`404 Not Found` for unassigned records).
3. **Invoice Generation, Tax Computation, PDF & Email (Screen 9):**
   - Generates official invoices from confirmed purchase orders with unique identifier `INV-YYYY-NNNN`.
   - Authoritative GST tax engine: calculates Subtotal, CGST (9.0%), SGST (9.0%), Total Tax (18%), and Grand Total to 2 decimal places using server-authoritative calculations.
   - **Downloadable PDF:** Professional vector PDF generated dynamically on the backend via `pdfkit` matching the Screen 9 design.
   - **Print-Friendly Layout:** Styled print stylesheet (`@media print`) for clean paper/printer output.
   - **SMTP Email Delivery:** Dispatches official invoice email with attached PDF using Nodemailer.
   - **Settlement Tracking:** Allows authorized managers to mark invoices as `PAID` with payment reference and date tracking.

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
| **Audit Log** | Prisma insert-only `AuditLog` service | Forensic traceability for all procurement events |
| **Testing** | Vitest, Supertest | 64 integration and unit tests passing across 5 test suites |

---

## 3. Workflow Implementation (Source-to-Invoice)

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
```

---

## 4. API Endpoints Reference (Week 3)

### Approvals (`/api/v1/approvals`)
- `GET /api/v1/approvals`: List approval requests with filter tabs (`ALL`, `PENDING`, `APPROVED`, `REJECTED`) and pagination.
- `GET /api/v1/approvals/:id`: Get single approval workflow detail with 4-step stepper and timeline (Screen 8).
- `GET /api/v1/approvals/by-rfq/:rfqId`: Resolve approval workflow by RFQ ID.
- `POST /api/v1/approvals/:id/approve`: Approve request, capture remarks/timestamp, and automatically generate Purchase Order (`MANAGER`, `ADMIN` only).
- `POST /api/v1/approvals/:id/reject`: Reject request with mandatory remarks (`MANAGER`, `ADMIN` only).

### Purchase Orders (`/api/v1/purchase-orders`)
- `GET /api/v1/purchase-orders`: List purchase orders (Staff sees all, Vendors see only own).
- `GET /api/v1/purchase-orders/:id`: Get purchase order document with items, vendor, and linked invoice (Screen 9).
- `POST /api/v1/purchase-orders/generate`: Generate PO from an approved quotation (Staff only; duplicate protected).

### Invoices (`/api/v1/invoices`)
- `GET /api/v1/invoices`: List invoices with status counts (`PENDING_PAYMENT`, `PAID`, `CANCELLED`).
- `GET /api/v1/invoices/:id`: Get invoice document with line items, tax breakdown, and linked PO (Screen 9).
- `POST /api/v1/invoices/generate`: Generate invoice from confirmed PO with 18% GST calculation.
- `PATCH /api/v1/invoices/:id/status`: Update invoice status (e.g. `PAID` with payment reference and date).
- `GET /api/v1/invoices/:id/pdf`: Stream vector PDF attachment matching Screen 9.
- `POST /api/v1/invoices/:id/email`: Send invoice email with attached PDF to vendor or custom recipient.

---

## 5. Quick Start Instructions

### Prerequisites
- Node.js 20+ installed
- PostgreSQL 16+ running locally (`localhost:5432`)

### 1. Backend Setup
```bash
cd server
npm install
cp .env.example .env

# Run Prisma migration & seed
npx prisma migrate dev
npm run db:seed

# Start development server (Port 4000)
npm run dev
```

### 2. Frontend Setup
```bash
cd ../client
npm install
cp .env.example .env

# Start frontend dev server (Port 5173)
npm run dev
```

### 3. Demo Accounts (Password for all: `Password@123`):
| Role | Email | Permissions |
|---|---|---|
| **Admin** | `admin@vendorbridge.local` | Full system access, all approvals, POs & Invoices |
| **Manager** | `manager@vendorbridge.local` | Screen 8 Approver: review, approve, reject, mark paid |
| **Procurement Officer** | `officer@vendorbridge.local` | Create RFQs, select quotes, generate PO/Invoice |
| **Vendor Partner** | `vendor@vendorbridge.local` | Submit quotes, view assigned POs and own Invoices |

---

## 6. Automated Testing (64 of 64 Passing)

Run the Vitest test suite from `server/`:

```bash
cd server
npm test
```

### Test Results Summary:
```
 ✓ src/modules/approvals/__tests__/week3-workflow.test.ts (16 tests)
 ✓ src/modules/vendors/__tests__/vendor-rbac-matrix.test.ts (25 tests)
 ✓ src/modules/auth/__tests__/auth.test.ts (14 tests)
 ✓ src/modules/vendors/__tests__/vendor-features.test.ts (7 tests)
 ✓ src/modules/quotations/__tests__/quotation.calculator.test.ts (2 tests)

 Test Files  5 passed (5)
      Tests  64 passed (64)
```

### Test Coverage Highlights for Week 3:
- **Approval RBAC:** Verified `MANAGER` and `ADMIN` can approve/reject; `PROCUREMENT_OFFICER` and `VENDOR` are blocked with `403 Forbidden`.
- **Automatic PO Generation:** Approving quotation creates `PurchaseOrder` with sequential `PO-YYYY-NNNN` number and copies all line items and pricing.
- **Duplicate Prevention:** Enforces `@unique` constraints; rejects duplicate PO creation for the same quotation (`409 Conflict`).
- **Invoice Math Validation:** Validates Subtotal (`₹1,69,500.00`) + CGST 9% (`₹15,255.00`) + SGST 9% (`₹15,255.00`) = Grand Total (`₹2,00,010.00`).
- **PDF Generation:** Validates binary PDF buffer streaming with `%PDF-` header and correct filename.
- **Email Delivery:** Validates Nodemailer dispatch with PDF attachment and metadata tracking.
- **Payment Settlement:** Updates status to `PAID` with payment reference and audit log recording.

---

## 7. Golden Mockup Document Verification (Screens 8 & 9)

### Screen 8: Approval Workflow
- Stepper: `1. Submitted (Done)` → `2. L1 Review (Done)` → `3. L2 approval (Active)` → `4. Generate PO`.
- Approvers: `Rahul Mehta (Procurement head)` and `Priya Shah (Finance manager)`.
- Live Remarks capture and decision logging.

### Screen 9: Purchase Order & Invoice
- **Golden Document:** `PO-2025-0068` / `INV-2025-0001`
- **Vendor:** Infra Supplies Pvt Ltd (GSTIN: `36AAACV1234F1Z5`)
- **Items:**
  1. Ergonomic Chairs (25 Units @ ₹3,500 = ₹87,500)
  2. Desks (10 Units @ ₹8,200 = ₹82,000)
- **Subtotal:** `₹1,69,500.00`
- **CGST (9%):** `₹15,255.00`
- **SGST (9%):** `₹15,255.00`
- **Total Tax (18%):** `₹30,510.00`
- **Grand Total:** `₹2,00,010.00`

---

## 8. Milestone Acceptance Checklist

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
  - [x] Database-enforced duplicate prevention (`@unique`).
  - [x] 64/64 automated tests passing.

---

*VendorBridge is developed for the 4-week Full Stack ERP Internship Milestone.*
