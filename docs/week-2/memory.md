# VendorBridge — Project Memory (Week 2)

Living context file. Read first, update after every task or decision, keep entries short and dated. Week 1's `memory.md` is history; its decisions still stand unless overridden here.

---

## 1. Project Snapshot

| Item | Value |
|---|---|
| Project | VendorBridge — Procurement & Vendor Management ERP |
| Repository | `VendorBridge-X-Kagnus` (one repo for all four weeks) |
| Current milestone | **Week 2 — RFQ & Quotation Management** |
| Status | Planning complete; implementation not started |
| Prerequisite | Week 1 merged, green, tagged `week-1` (**verify before starting**) |
| In scope | Screens 5, 6, 7 + RFQ list/detail (extension), vendor portal, vendor↔user link, vendor rating |
| Out of scope | Approvals (Wk 3), PO/invoice, reports, activity UI (Wk 4) |
| Special focus | Maintainability and scalability (shared package, module boundaries, repositories, state machines, storage/event/clock abstractions, CI gates) |
| Docs | `prd.md`, `architecture.md`, `rules.md`, `design.md`, `tasks.md`, `memory.md` (Week 2 set) |

## 2. One-Paragraph Brief

Officers create RFQs (line items, deadline, attachments) and assign Active vendors. Vendors see only their assigned RFQs, submit and edit quotations before the deadline. Officers compare submitted quotations side by side (lowest valid price highlighted, sort/filter, ratings, empty states) and select one; the selection is stored on the RFQ for Week 3's approval workflow. All data persists in the database, access control is enforced on the backend, and quotations can only link to their own RFQ and an assigned vendor (service + DB constraints). Rejected outcomes: hardcoded data, mislinked quotations, unauthorized vendor access, comparison not based on real submissions, missing source/evidence.

## 3. Key Decisions Log

| # | Date | Decision | Reason | Status |
|---|---|---|---|---|
| D11 | 2026-10-19 | Add `shared/` workspace (`@vendorbridge/shared`) for schemas, enums, permissions, errors, state tables, totals calculator | One source of truth; no client/server drift | Proposed |
| D12 | 2026-10-19 | Modular monolith with enforced boundaries (`dependency-cruiser`); modules talk via `index.ts` or events | Keeps coupling low as Weeks 3–4 add modules | Proposed |
| D13 | 2026-10-19 | Layering: controller → service → repository (+ policy, mapper). Only repositories import Prisma | Testability, swap-ability, consistent pattern | Proposed |
| D14 | 2026-10-19 | Money = `Decimal(14,2)` in DB, string in JSON, decimal.js in code; totals computed server-side (half-up) | Avoid float errors; trustworthy totals | Proposed |
| D15 | 2026-10-19 | Composite FKs + unique + CHECK constraints guarantee quote↔RFQ↔vendor integrity | Brief requires quotations never link to unrelated RFQs/vendors | Proposed |
| D16 | 2026-10-19 | One quotation per (RFQ, vendor); edits update it and write a revision snapshot | Simple model + audit trail | Proposed |
| D17 | 2026-10-19 | `RfqStatus`: DRAFT, OPEN, CLOSED, QUOTATION_SELECTED, CANCELLED; Week 3 appends approval states | Extensible state machine as data | Proposed |
| D18 | 2026-10-19 | Deadline enforced by server clock inside the write transaction; effective status derived on read; background job persists CLOSED | Correct even if job lags | Proposed |
| D19 | 2026-10-19 | Selection stored on RFQ (`selectedQuotationId/By/At`); selecting sets `QUOTATION_SELECTED` and locks quotes | Week 3 reads one column / subscribes to `QuotationSelected` | Proposed |
| D20 | 2026-10-19 | Lowest = min `grandTotal` among valid comparable quotes; ties all flagged; computed over full set regardless of filters | Truthful badge; filters can't distort it | Proposed |
| D21 | 2026-10-19 | Object-level denial → 404; role-level → 403 | Don't leak existence of other RFQs | Proposed |
| D22 | 2026-10-19 | `VendorMember` links Vendor-role users to vendor records (one vendor per user in Week 2) | Vendor portal needs "my vendor"; relaxing later is a one-line migration | Proposed — confirm |
| D23 | 2026-10-19 | Only **Active** vendors can be assigned; blocked vendors can't write quotes; their quotes excluded from "lowest"/selection | Data integrity and business sanity | Proposed |
| D24 | 2026-10-19 | Optimistic locking via `version` on RFQ and Quotation | Safe concurrent edits near deadlines | Proposed |
| D25 | 2026-10-19 | Attachments via `StorageProvider` (local now, S3-compatible later); magic-byte validation; authenticated downloads only | Scale + security | Proposed |
| D26 | 2026-10-19 | Side effects (email, audit) via in-process domain events; handlers non-fatal and idempotent | Queue-ready, resilient | Proposed |
| D27 | 2026-10-19 | RFQ code `RFQ-YYYY-NNNN` via atomic DB counter | Human-readable and race-safe | Proposed |
| D28 | 2026-10-19 | Delivery time per line item; quotation-level = max | Matches Screen 6 columns; comparison needs one number | Proposed |
| D29 | 2026-10-19 | Comparison sort/filter handled server-side; response includes `lowestQuotationIds` | Single source of truth; scales | Proposed |
| D30 | 2026-10-19 | Sealed-bid behavior behind `SEALED_BIDS` flag, default off | Business rule unclear; cheap to leave a seam | Proposed |

## 4. Deviations and Extensions (awaiting approval)

1. Screen 5 stepper unlabeled → map to sections 1 Details / 2 Items & Vendors / 3 Attachments & Send; keep wireframe layout on desktop.
2. RFQ list and detail pages added (not in mockup); built on the Vendors page pattern.
3. "Select & Approve" renamed **"Select"** (no approval flow until Week 3); restore in Week 3.
4. Structured **Payment terms (days)** field added to Screen 6 (needed for comparison row).
5. Vendor **Rating** field (optional) added to vendor form; **Portal users** section added to vendor drawer.
6. Comparison toolbar (sort/filter) and line-item breakdown added.
7. Quotations hub for staff (entry to comparison) and vendor-side routing for "RFQ's" item.
8. Mockup data typos corrected: Screen 6 subtotal 1,69,599 → **1,69,500**; "Tech Core LTD" in the item column is treated as a stray vendor label.

## 5. Assumptions

- Week 1 is complete and passing; `AuditLog`, RBAC middleware, `AppShell`, UI kit, and seed exist as specified.
- Currency INR only; GST is a single quote-level percentage (default 18); no multi-currency or per-line tax.
- Vendor users register via Week 1's flow with role Vendor; an Admin/Officer links them to a vendor record.
- Officers can **view** all RFQs but **mutate** only their own (Admin overrides). Managers are read-only.
- Quotations are visible to staff as soon as submitted (sealed bids off).
- Partial awards (per line item) are out of scope; selection is whole-quotation.
- Notification email content is simple text/HTML with a link to the app; users must log in (no tokenized links).
- Local-disk storage is acceptable for the demo; S3 only if the environment provides it.
- Week 2 demo accounts (dev seed only): one Admin, two Officers, one Manager, three Vendor users linked to three different vendors, plus one unlinked Vendor user.

## 6. Open Questions

- [ ] Confirm stepper mapping and "Select" label (Deviations 1, 3).
- [ ] Sealed bids required? If yes, until deadline or until close?
- [ ] Can an Officer manage another Officer's RFQ?
- [ ] Can a vendor user belong to multiple vendor companies?
- [ ] Is vendor "decline RFQ" needed?
- [ ] Is a deployed preview with S3-compatible storage available, or is local disk fine?
- [ ] Should staff be notified in-app (not just email) when quotes arrive?
- [ ] Export of comparison (CSV/PDF) — now or Week 4?
- [ ] Should the vendor's "RFQ's" and "Quotations" nav items be merged (Design §6)?

## 7. Conventions Cheat Sheet

- API base `/api/v1`; vendor-facing routes under `/vendor-portal/*`; error shape `{ error: { code, message, details? } }`
- IDs: UUID internal; RFQ code `RFQ-YYYY-NNNN`
- Statuses — RFQ: `DRAFT | OPEN | CLOSED | QUOTATION_SELECTED | CANCELLED`; Quotation: `DRAFT | SUBMITTED`; Vendor: `ACTIVE | PENDING | BLOCKED`
- Money strings, 2 decimals, half-up; Indian grouping in UI (`₹2,00,010`)
- Limits: items ≤ 50, vendors ≤ 20, attachments ≤ 5 (10 MB each), comparison ≤ 20 quotations
- Allowed uploads: PDF, DOCX, XLSX, CSV, PNG, JPG (magic-byte verified)
- Import path for contracts: `@vendorbridge/shared`
- Business rules referenced as `BR-n` (see `prd.md` §3a); ADRs in `docs/adr/`
- Golden test numbers: `25×3500 + 10×8200 = 169500`; GST 18% = `30510`; total = `200010`
- Ports: client 5173, API 4000, Postgres 5432

## 8. Progress Tracker

| Phase | Status | Notes |
|---|---|---|
| 0 Foundations (shared pkg, boundaries, CI, patterns) | Not started | |
| 1 Database and domain core | Not started | |
| 2 Vendor linking and rating | Not started | |
| 3 Attachments infrastructure | Not started | |
| 4 RFQ backend | Not started | |
| 5 Vendor portal + quotations backend | Not started | |
| 6 Comparison, selection, jobs, notifications | Not started | |
| 7 Frontend foundation | Not started | |
| 8 RFQ UI | Not started | |
| 9 Vendor quotation UI | Not started | |
| 10 Comparison UI + dashboard | Not started | |
| 11 Quality, security, scale checks | Not started | |
| 12 Submission package | Not started | |

## 9. Tech Debt Register (max 5 open)

| # | Item | Why deferred | Impact | Payoff trigger | Owner | Status |
|---|---|---|---|---|---|---|
| — | _None yet_ | | | | | |

Likely candidates (log only if they actually happen): Week 1 modules other than `vendors` not yet on the repository/policy/mapper pattern; offset pagination instead of keyset; in-process event bus without retry; local-disk storage; comparison not cached.

## 10. Hooks Reserved for Week 3 (do not build now)

- Event `QuotationSelected` — approval workflow subscribes to create the approval request.
- Column `Rfq.selectedQuotationId` (+ `selectedById`, `selectedAt`) — read model for approval and PO generation.
- `RfqStatus` extensible; guard "no re-selection once approval started" to be added in Week 3.
- Label **"Select & Approve"** to be restored on the comparison screen in Week 3.
- Audit log already records all RFQ/quotation state changes (insert-only) for Week 4's Activity screen.

## 11. Known Limitations (expected — document in README and report)

- Approval, PO, invoice, report, and activity screens remain placeholders.
- Email delivery depends on configured SMTP; dev uses a mail catcher.
- Single currency (INR) and single tax rate per quotation.
- Whole-quotation selection only.
- A vendor user belongs to one vendor company.
- Files stored on local disk unless S3 is configured.
- Staff see quotations immediately (no sealed bids) unless the flag is enabled.

## 12. Test and Performance Log

| Date | Scope | Result | Notes |
|---|---|---|---|
| — | — | — | Record test runs (pass/fail counts) and perf numbers (list/compare p95 at 10k RFQs, 100k quotes) |

## 13. Session Log

Append newest at the bottom. Format: `YYYY-MM-DD — what changed — what's next`.

- 2026-10-19 — Created Week 2 `prd.md`, `architecture.md`, `rules.md`, `design.md`, `tasks.md`, `memory.md` from the Week 2 brief and mockup screens 5–7, with added maintainability/scalability architecture. — Next: confirm §6 open questions; verify Week 1 is green; start Phase 0.
