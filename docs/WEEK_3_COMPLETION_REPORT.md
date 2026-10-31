# VendorBridge — Week 3 Completion Report
**Milestone:** Approval Workflow, Purchase Orders & Invoices  
**Date:** October 31, 2026  
**Status:** Complete & Fully Integrated  
**Test Suite:** 64/64 Passing (100% Success Rate)

---

## 1. Overview of Delivered Features

This report documents the completion of **Week 3** for **VendorBridge — Procurement & Vendor Management ERP**, connecting the Week 2 RFQ Quotation Comparison module to official multi-step approval workflows, purchase orders, and billing invoices.

### Deliverables Implemented & Verified:
1. **Approval Workflow (Screen 8 — `/approvals/:id`):**
   - Live procurement request evaluation for quotations selected during RFQ comparison.
   - 4-step linear approval stepper:
     - `1. Submitted` (Completed)
     - `2. L1 Review` (Completed by Rahul Mehta)
     - `3. L2 approval` (Active step assigned to Priya Shah)
     - `4. Generate PO` (Triggered on approval)
   - Decision controls: Remarks capture, Decision timestamp, and database persistence.
   - Strict RBAC: Only `MANAGER` and `ADMIN` roles can decide requests. `PROCUREMENT_OFFICER` and `VENDOR` roles receive `403 Forbidden`.
   - Rejection modal requiring mandatory justification remarks.
2. **Purchase Order Generation (Screen 9 — `/purchase-orders/:id`):**
   - Automatically issued when a quotation receives manager approval.
   - Atomic collision-free identifier sequence `PO-YYYY-NNNN` using PostgreSQL `Counter`.
   - Full line item snapshotting, quantities, unit prices, vendor metadata, and delivery timelines.
   - Linked directly to source Quotation, RFQ, and Approval record.
   - Database-level duplicate protection: `@unique` constraint on `quotationId` prevents duplicate PO generation (`409 Conflict`).
   - Object-level security: Vendors only have read access to POs issued to their account (`404 Not Found` for unassigned records).
3. **Invoice Generation, PDF, Print & Email (Screen 9 — `/invoices/:id`):**
   - Generated from valid, confirmed purchase orders with unique identifier `INV-YYYY-NNNN`.
   - Authoritative GST tax calculation:
     - Subtotal = $\sum (\text{Qty} \times \text{Unit Price})$
     - CGST = $9.0\%$ of Subtotal
     - SGST = $9.0\%$ of Subtotal
     - Total Tax = CGST + SGST ($18.0\%$)
     - Grand Total = Subtotal + Total Tax
   - **PDF Generation:** Server-side streaming vector PDF using `pdfkit` (`GET /api/v1/invoices/:id/pdf`).
   - **Print-Friendly Styling:** `@media print` CSS optimization for browser printing.
   - **SMTP Email Delivery:** Dispatches official invoice email with attached PDF via Nodemailer (`POST /api/v1/invoices/:id/email`).
   - **Settlement Actions:** Authorized managers can mark invoices as `PAID` with payment reference/UTR number and payment date.

---

## 2. Architecture & Database Modifications

### 2.1 Prisma Schema Additions (`schema.prisma`)
- **New Enums:**
  - `ApprovalStatus`: `PENDING`, `APPROVED`, `REJECTED`
  - `PoStatus`: `ISSUED`, `CONFIRMED`, `DELIVERED`, `CANCELLED`
  - `InvoiceStatus`: `PENDING_PAYMENT`, `PAID`, `CANCELLED`
- **Updated Enums:**
  - `QuotationStatus`: added `APPROVED`, `REJECTED`
- **New Models:**
  - `ApprovalRequest`: stores RFQ link, Quotation link, requester, decider, status, current step, remarks, timestamps. Unique on `quotationId`.
  - `ApprovalStep`: tracks multi-level approval history (step number, title, approver role, assigned user, status, remarks, decidedAt).
  - `PurchaseOrder`: stores human-readable `poNumber`, status, vendor details, RFQ/quote references, payment terms, and totals. Unique on `quotationId`.
  - `PurchaseOrderItem`: line items snapshot.
  - `Invoice`: stores human-readable `invoiceNumber`, status, due date, paid date, payment reference, and tax breakdown. Unique on `purchaseOrderId`.
  - `InvoiceItem`: line items snapshot with unit price and tax rate.
- **Migration:** `20261031135536_week3_approvals_po_and_invoices` applied successfully.

### 2.2 Permissions Matrix (`src/config/permissions.ts`)
| Permission | Admin | Manager | Procurement Officer | Vendor |
|---|:---:|:---:|:---:|:---:|
| `approval:read` | ✅ | ✅ | ✅ | ❌ |
| `approval:decide` | ✅ | ✅ | ❌ | ❌ |
| `po:read` | ✅ | ✅ | ✅ | ✅ (Own only) |
| `po:create` | ✅ | ✅ | ✅ | ❌ |
| `invoice:read` | ✅ | ✅ | ✅ | ✅ (Own only) |
| `invoice:create` | ✅ | ✅ | ✅ | ❌ |
| `invoice:markPaid`| ✅ | ✅ | ❌ | ❌ |
| `invoice:email` | ✅ | ✅ | ✅ | ❌ |

---

## 3. Automated Test Verification

**Command:** `npm test` from `server/`  
**Execution Mode:** Vitest with sequential execution (`--no-file-parallelism`)  
**Results:** **64 tests passed across 5 test suites (100% Passing)**

```
 ✓ src/modules/approvals/__tests__/week3-workflow.test.ts (16 tests)
 ✓ src/modules/vendors/__tests__/vendor-rbac-matrix.test.ts (25 tests)
 ✓ src/modules/auth/__tests__/auth.test.ts (14 tests)
 ✓ src/modules/vendors/__tests__/vendor-features.test.ts (7 tests)
 ✓ src/modules/quotations/__tests__/quotation.calculator.test.ts (2 tests)

 Test Files  5 passed (5)
      Tests  64 passed (64)
```

### Key Integration Tests in `week3-workflow.test.ts`:
1. `GET /api/v1/approvals`: Returns list of approvals with counts and filters.
2. `GET /api/v1/approvals/:id`: Returns Screen 8 detail with 4-step stepper and timeline.
3. `POST /api/v1/approvals/:id/approve`: Approves request and auto-creates Purchase Order.
4. `POST /api/v1/approvals/:id/reject`: Rejects request with required remarks.
5. `403 Forbidden Check`: Verifies Procurement Officer cannot approve/reject.
6. `POST /api/v1/purchase-orders/generate`: Prevents duplicate PO generation (`409 Conflict`).
7. `GET /api/v1/purchase-orders/:id`: Returns Screen 9 PO document.
8. `Vendor PO Isolation`: Vendor gets `404 Not Found` when requesting unrelated PO.
9. `POST /api/v1/invoices/generate`: Generates invoice with 18% GST calculation.
10. `GET /api/v1/invoices/:id`: Returns invoice matching golden calculations.
11. `PATCH /api/v1/invoices/:id/status`: Updates invoice to `PAID` with payment reference.
12. `GET /api/v1/invoices/:id/pdf`: Returns valid binary PDF with `%PDF-` header.
13. `POST /api/v1/invoices/:id/email`: Dispatches email with PDF attachment.

---

## 4. Frontend Delivery & Polish

### 4.1 Pages Implemented:
1. `ApprovalsListPage.tsx` (`/approvals`):
   - Metric cards: Pending Approvals, Approved Requests, Rejected Requests, Total Evaluated.
   - Filter tabs: All, Pending Approval, Approved, Rejected with live counter badges.
   - Search by RFQ code, title, and vendor name.
   - Review action buttons.
2. `ApprovalWorkflowPage.tsx` (`/approvals/:id`, `/approvals/by-rfq/:rfqId`):
   - Screen 8 high-fidelity view matching Excalidraw mockup.
   - 4-step stepper with active step indicators.
   - Approval chain cards (Rahul Mehta, Priya Shah).
   - Approval remarks textarea and Approve/Reject actions.
3. `PurchaseOrdersListPage.tsx` (`/purchase-orders`):
   - Metric cards: Issued POs, Confirmed, Delivered, Total Issued.
   - Filter tabs by `PoStatus`.
   - 1-click "Gen Invoice" button if invoice has not been created yet.
4. `InvoicesListPage.tsx` (`/invoices`):
   - Metric cards: Pending Payment, Paid Invoices, Cancelled, Total.
   - Direct PDF download button in table row.
5. `InvoiceDocumentPage.tsx` (`/purchase-orders/:id`, `/invoices/:id`):
   - Screen 9 unified document matching Excalidraw mockup.
   - Download PDF button (fetches blob and triggers browser download).
   - Print button (`window.print()`).
   - Email modal with prefilled vendor contact email and toast feedback.
   - Mark as Paid modal with payment reference and settlement date.
6. `DashboardPage.tsx` & `RfqComparisonPage.tsx`:
   - Updated Dashboard with live PO table and interactive stat cards.
   - Added winning quotation selection banner linking directly to Screen 8.

---

## 5. Known Limitations & Scope Boundaries

1. **Email Delivery Provider:**
   - In development environments without live SMTP credentials, emails are processed via Ethereal / test SMTP and logged to stdout with preview URLs (`Preview URL: false`). In production, standard environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) should be configured.
2. **Three-Way Matching:**
   - Three-way matching (matching PO vs Goods Receipt vs Invoice) and inventory receipt management are scheduled for Week 4 milestone.
3. **Advanced Tax Rules:**
   - Standard Indian GST (9% CGST + 9% SGST = 18%) is applied uniformly. Inter-state IGST (18%) and custom tax exemption slabs will be expanded in future versions.

---

*Report prepared for VendorBridge — Kagnus Internship Week 3 Submission.*
