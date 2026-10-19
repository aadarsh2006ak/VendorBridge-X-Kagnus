# VendorBridge — Product Requirements Document (Week 2)

**Milestone:** Week 2 — RFQ & Quotation Management
**Repository:** `VendorBridge-X-Kagnus` (same repo; builds on Week 1)
**Design source of truth:** VendorBridge Excalidraw mockup — Screen 5 (Create RFQ), Screen 6 (Submit Quotations), Screen 7 (Quotation Comparison)
**Engineering focus this week:** maintainability and scalability (see `architecture.md` §2 and `rules.md` §2). Week 2 is where the codebase either becomes a platform for Weeks 3–4 or starts accumulating debt.

---

## 1. Summary

Week 2 delivers the core procurement workflow:

1. A **Procurement Officer** creates an RFQ (line items, deadline, attachments) and assigns it to registered vendors.
2. **Vendors** see only the RFQs assigned to them and submit (and edit, before the deadline) a quotation.
3. The officer **compares** submitted quotations side by side, with the lowest valid price highlighted, and **selects** one.
4. The selected quotation is stored in a way Week 3's approval workflow can pick up directly.

Everything must be database-backed, role-enforced on the backend, and demonstrable end to end across multiple accounts.

## 2. Goals and Non-Goals

### Goals
- RFQ create / list / view / edit-while-draft / publish / close / cancel with unique human-readable IDs.
- Vendor assignment with backend-enforced visibility (a vendor never sees another vendor's RFQ or quotation).
- Quotation draft, submit, and edit-before-deadline with server-side deadline enforcement.
- Comparison screen using real submitted data: lowest-price highlighting, sorting, filtering, rating indicators, empty states.
- Referential integrity guaranteeing a quotation can only belong to its own RFQ and an assigned vendor.
- A selected quotation clearly identifiable for Week 3.
- Foundations that keep Weeks 3–4 cheap: shared schemas package, module boundaries, state machines, storage abstraction, domain events.

### Non-Goals (Week 2)
Approval workflow and approval statuses (Week 3), purchase orders and invoices (Week 4), reports (Week 4), activity log UI (Week 4), vendor decline/negotiation flows, multi-currency, email reply parsing, e-signatures, per-line partial awards, sealed-bid mode (see Open Questions).

## 3. Roles and Permissions

Week 1 roles are unchanged. Week 2 adds a **Vendor ↔ Vendor-record link** (see VEN-L) so a Vendor user can act for a vendor company.

| Capability | Admin | Procurement Officer | Manager/Approver | Vendor |
|---|:-:|:-:|:-:|:-:|
| List / view all RFQs | ✅ | ✅ | ✅ (read) | ❌ (sees assigned only, via vendor portal) |
| Create RFQ | ✅ | ✅ | ❌ | ❌ |
| Edit / publish / close / cancel / delete RFQ | ✅ | ✅ own RFQs | ❌ | ❌ |
| Manage RFQ attachments | ✅ | ✅ own RFQs | ❌ | ❌ |
| Download RFQ attachments | ✅ | ✅ | ✅ | ✅ assigned, published only |
| View assigned RFQ (vendor-safe view) | n/a | n/a | n/a | ✅ |
| Create / edit / submit own quotation | ❌ | ❌ | ❌ | ✅ assigned RFQ, before deadline |
| View quotations for an RFQ | ✅ | ✅ | ✅ | ❌ (own only) |
| Compare quotations | ✅ | ✅ | ✅ (read) | ❌ |
| Select a quotation | ✅ | ✅ own RFQs | ❌ | ❌ |
| Link vendor users to vendor records | ✅ | ✅ | ❌ | ❌ |
| Set vendor rating | ✅ | ✅ | ❌ | ❌ |

Rules:
- Role-level denial → `403`. Object-level denial (e.g., vendor requests an RFQ not assigned to them) → `404`, so the existence of other RFQs is not leaked.
- All checks are enforced server-side; the UI only mirrors them.

## 3a. Business Rules (authoritative)

| ID | Rule |
|---|---|
| BR-1 | RFQ IDs are unique and human-readable: `RFQ-{YYYY}-{NNNN}` (per-year sequence), alongside an internal UUID. |
| BR-2 | Only vendors with status **Active** may be assigned to an RFQ. Pending and Blocked vendors are rejected. |
| BR-3 | An RFQ needs ≥1 line item, ≥1 assigned vendor (to publish), and a deadline in the future (to publish). Drafts may be incomplete but must have a title. |
| BR-4 | Server time is authoritative for deadlines. A quotation write after the deadline is rejected (`409 RFQ_DEADLINE_PASSED`), even if the UI was open. |
| BR-5 | One quotation per (RFQ, vendor). Editing updates it; it never creates duplicates. |
| BR-6 | A quotation prices **every** RFQ line item. Quantities come from the RFQ and cannot be changed by the vendor. |
| BR-7 | Totals are computed on the server only: `lineTotal = unitPrice × qty`, `subtotal = Σ lineTotal`, `tax = subtotal × taxRate%`, `grandTotal = subtotal + tax`, rounded half-up to 2 decimals. Client totals are previews. |
| BR-8 | Quotation delivery time is per line item (days); quotation-level delivery = max of lines. |
| BR-9 | A quotation is **comparable and valid** if it is `SUBMITTED`, prices all line items, has `grandTotal > 0`, and belongs to the RFQ being compared. Drafts never appear in comparison. |
| BR-10 | The **lowest** quotation is the valid one with the minimum `grandTotal`. Ties: all tied quotations are flagged lowest. Lowest is computed over all valid quotations, regardless of active filters. |
| BR-11 | Vendors may edit a submitted quotation until the deadline, while the RFQ is `OPEN` and the quotation is not selected. Each edit creates a revision snapshot. |
| BR-12 | Selecting a quotation moves the RFQ to `QUOTATION_SELECTED` and locks all quotations. Re-selecting is allowed until Week 3's approval starts (Week 3 adds that guard). |
| BR-13 | Line items on an `OPEN` RFQ cannot change (would invalidate quotes). Allowed on `OPEN`: extend the deadline (never shorten), add vendors, edit description. |
| BR-14 | An `OPEN` RFQ whose deadline passes becomes `CLOSED` (derived immediately on read; persisted by a background job). A `CLOSED` RFQ with no selection can be reopened only by setting a new future deadline. |
| BR-15 | A vendor assignment can be removed only if that vendor has no submitted quotation. |
| BR-16 | If a vendor becomes Blocked after assignment, they can no longer create or edit quotations; existing submitted quotations remain visible to the officer, flagged "vendor blocked", and are excluded from lowest-price selection. |
| BR-17 | Deadlines are stored in UTC and displayed in the user's locale; default entry time is 23:59 IST on the chosen date. |

## 4. Functional Requirements

### 4.1 RFQ Management (Screen 5 + list/detail)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| RFQ-1 | Create RFQ | Fields: title*, category, deadline*, description, line items (item, qty, unit), assigned vendors, attachments. IDs per BR-1. |
| RFQ-2 | Save as Draft | Stores RFQ as `DRAFT`; not visible to vendors; editable. |
| RFQ-3 | Save & Send to Vendors | Validates BR-3, transitions to `OPEN` atomically with creation; assigned vendors are notified (in-app visibility + email). |
| RFQ-4 | Line items | Add/remove rows; name (required), qty > 0, unit from list; max 50 rows. |
| RFQ-5 | Vendor assignment | Search/select multiple Active vendors; chips with remove (×); max 20 vendors per RFQ. |
| RFQ-6 | Attachments | Drag-and-drop or click upload; PDF, DOCX, XLSX, CSV, PNG, JPG; ≤ 10 MB each; ≤ 5 per RFQ; validated by content, not extension. |
| RFQ-7 | RFQ list | Columns: RFQ ID, Title, Category, Deadline, Vendors (quoted/assigned), Status, Action. Search by ID/title; status chips with counts; pagination; sorting. |
| RFQ-8 | RFQ detail | Requirements, line items, attachments, deadline countdown, per-vendor status (Invited / Viewed / Quoted), actions by state. |
| RFQ-9 | Status tracking | Statuses: Draft, Open, Closed, Quotation Selected, Cancelled, with colored badges. |
| RFQ-10 | Close / Cancel / Reopen / Delete | Per state machine; delete only for `DRAFT` (soft delete); cancel requires a reason. |
| RFQ-11 | Validation | Server-side Zod validation mirrored client-side; field-level errors. |

### 4.2 Vendor Portal and Access (Screen 6 entry)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| VEN-L | Vendor user ↔ vendor record link | Officer/Admin can link a Vendor-role user to a vendor record (vendor drawer → "Portal users"). A Vendor user without a link sees an explanatory empty state and no RFQs. One vendor can have several users; a user belongs to one vendor in Week 2. |
| VP-1 | Assigned RFQs list | Vendor sees only non-draft RFQs assigned to their vendor, with deadline, status, and "Quote submitted / Awaiting quotation". |
| VP-2 | RFQ detail (vendor-safe) | Shows requirements, line items, deadline, attachments. Never shows other invited vendors, other quotations, or internal notes. |
| VP-3 | First view tracking | First open sets "Viewed" for that vendor. |

### 4.3 Quotation Submission (Screen 6)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| Q-1 | Quote form | RFQ summary box; table (Item, Qty, Unit price, Total, Delivery days); Tax/GST %; Notes/terms; payment terms (days); summary (Subtotal, GST, Grand total). |
| Q-2 | Save Draft | Persists partial quote; may be incomplete; excluded from comparison. |
| Q-3 | Submit Quotation | Validates BR-6/7; status `SUBMITTED`; officer notified. |
| Q-4 | Edit before deadline | Allowed per BR-11; version conflicts (`409 VERSION_CONFLICT`) handled with a clear message. |
| Q-5 | Deadline enforcement | After deadline, form is read-only and API rejects writes (BR-4). |
| Q-6 | Authorization | Only a member of an assigned, Active vendor can write; unrelated RFQs return `404`. |
| Q-7 | Live preview | Totals update as the vendor types (client preview using shared calculator; server authoritative). |

### 4.4 Quotation Comparison (Screen 7)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| C-1 | Side-by-side table | Criteria rows × vendor columns: Grand Total, GST %, Delivery (days), Vendor rating, Payment terms. |
| C-2 | Lowest highlight | Column for lowest valid price is green with a text badge "Lowest" (not color-only). |
| C-3 | Sorting | By price, delivery, rating, submission time; asc/desc. |
| C-4 | Filtering | Max price, max delivery days, min rating, specific vendors. |
| C-5 | Ratings | Shown as `4.5/5` when available; "Not rated" otherwise. |
| C-6 | Empty states | No quotations yet; all filtered out; RFQ with only drafts. |
| C-7 | Select | "Select" on each column sets the RFQ's selected quotation (BR-12). |
| C-8 | Data integrity | Comparison reads only real saved quotations from the API. |
| C-9 | Line breakdown (extension) | Collapsible per-item unit-price comparison with the lowest unit price marked. |

### 4.5 Integration with Week 1

- Reuse auth, sessions, RBAC middleware, error format, audit log, UI kit, `AppShell`.
- Sidebar items **RFQ's** and **Quotations** become active (no longer "Coming soon").
- Dashboard: "Active RFQ's" shows real data (scoped to role); "Pending Approvals", "PO's this month", "Overdue invoices" remain empty states; "+ New RFQ" quick action is enabled for Admin/Officer.
- Vendor model gains an optional `rating` (0–5, one decimal), editable by Admin/Officer.

## 5. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Security | Object-level authorization on every RFQ/quotation/attachment route; audience-specific response shapes (vendor DTOs omit internal data); upload validation; rate limits on upload and submit; no secrets in client. |
| Data integrity | DB-level constraints (composite foreign keys, unique, CHECK) in addition to service validation; transactions for multi-row writes; optimistic concurrency via `version`. |
| Performance | RFQ list p95 < 300 ms at 10k RFQs; comparison p95 < 500 ms at 20 quotations × 50 line items; no N+1 queries (verified by query-count tests). |
| Scalability | Stateless API (horizontally scalable); file storage behind an interface (local → S3-compatible); background job safe on multiple instances (advisory lock); cursor/offset pagination standard; indexes documented. |
| Maintainability | Module boundaries enforced by lint; shared schemas package; state machines as data; < 300 lines per file target; documented decisions (ADRs). |
| Reliability | Side effects (emails) never fail a user request; failures logged and retriable. |
| Accessibility | Keyboard-usable comparison table and forms; status never color-only; upload dropzone has a keyboard-accessible button. |
| Observability | Request IDs, structured logs, audit entries for every state change. |
| Time | UTC in DB; injected clock in code for deterministic deadline tests. |

## 6. Submission Package (mandatory)

1. Updated repo with working Week 2 features and meaningful commits (Conventional Commits).
2. README updated: new env vars (storage, mail, job settings), migration and seed steps, new demo accounts.
3. Screenshots or video: RFQ creation (multi-vendor + attachment) → vendor A and vendor B submit quotes from separate accounts → vendor edits before deadline → unrelated vendor denied → officer comparison with lowest highlight, sort/filter → selection → refresh persistence.
4. Deployed preview, if available.
5. Completion report: implemented features, tests performed, known limitations, deviations.

## 7. Definition of Done

- [ ] Create an RFQ, assign ≥ 2 vendors, publish; vendors see it, others do not (verified by API calls as each role).
- [ ] Each vendor submits a quotation; edit works before deadline; fails after (clock-controlled test and manual).
- [ ] Comparison shows real data, highlights lowest valid, sorts and filters, handles empty states.
- [ ] A quotation cannot be attached to an unrelated RFQ or unassigned vendor (service **and** DB constraints tested).
- [ ] Selected quotation persisted on the RFQ and visible after refresh.
- [ ] Role × endpoint matrix test extended to all new routes (including IDOR cases).
- [ ] CI green: lint, typecheck, boundary check, tests, build.
- [ ] README, demo evidence, completion report delivered.

**Not accepted:** hardcoded RFQs or comparisons; quotations not linked to correct vendor and RFQ; unauthorized vendor access or submissions; comparison not using submitted data; missing source or evidence.

## 8. Deviations and Extensions (need approval)

| # | Item | Change | Reason |
|---|---|---|---|
| 1 | Screen 5 stepper (1-2-3) has no labels; wireframe shows all fields on one canvas | Keep the wireframe layout on desktop; map steps to sections: **1 Details** (title, category, deadline, description), **2 Items & Vendors** (line items, assign vendors), **3 Attachments & Send** (attachments, actions). On mobile, show one step at a time. | Preserve layout while making the stepper meaningful |
| 2 | RFQ list and RFQ detail pages are not in the mockup | Design by extension using the Vendors page pattern (search, chips, table, drawer/detail) | Required by the brief |
| 3 | Screen 7 button "Select & Approve" | Label **"Select"** on all columns; helper text "Approval starts in Week 3" | Approval workflow does not exist yet; label must not promise it. Restore label in Week 3. |
| 4 | Screen 6 has only "Notes / terms" text | Add structured **Payment terms (days)** | Comparison screen shows "Payment terms: 30 days" and must be comparable |
| 5 | Vendor form (Week 1) | Add optional **Rating (0–5)** | Comparison shows vendor rating |
| 6 | Vendor drawer (Week 1) | Add **Portal users** section | Needed to link vendor logins to vendor records |
| 7 | Mockup sample-data errors | Screen 6 subtotal "1,69,599" is a typo (87,500 + 82,000 = 1,69,500; GST 18% = 30,510; grand total 2,00,010 ✓); second row item label "Tech Core LTD" is a vendor name in the item column. Implement correct arithmetic and use item names in item cells. | Data/typo, not design |

## 9. Open Questions

1. **Sealed bids:** should officers see quotations before the deadline, or only after? Default for Week 2: visible immediately. A feature flag (`SEALED_BIDS`) is designed in but off.
2. May Officers manage each other's RFQs, or only their own? Default: own only (Admin overrides).
3. Is a vendor user ever tied to more than one vendor company?
4. Should vendors be able to decline an RFQ explicitly?
5. Storage for deployment: local disk is fine for demo; confirm if S3-compatible storage is available.
6. Confirm stepper mapping (Deviation #1) and the "Select" label (Deviation #3).
7. Should comparison be exportable (CSV/PDF)? Currently backlog.
