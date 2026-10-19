# VendorBridge — Week 2 Task Plan

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · **(M)** = maintainability/scalability foundation task. Complete phases in order; each ends with something demonstrable. Update this file and `memory.md` after every task.

**Estimated effort:** ~9–11 working days for one developer. Phase 0 is deliberately front-loaded: ~1.5 days that save more than that across Weeks 2–4.

**Prerequisite:** Week 1 is merged, green, and tagged `week-1`. (If anything from Week 1 is incomplete, fix it first — do not build on it.)

---

## Phase 0 — Foundations for Growth (≈ 1.5 days) **(M)**

- [ ] **0.1** Create `shared/` npm workspace `@vendorbridge/shared` (tsconfig project references, build with `tsup`); wire into `client/` and `server/`
- [ ] **0.2** Move to `shared/`: role/status enums, constants & limits, permission map, error codes, existing Week 1 Zod schemas (auth, vendor); update both sides to import from it
- [ ] **0.3** Add `Clock`, `EventBus`, `Mailer`, `StorageProvider` interfaces + implementations (`SystemClock/FixedClock`, in-process bus, SMTP mailer, `LocalDiskStorage`); create `server/src/container.ts` composition root
- [ ] **0.4** Add `dependency-cruiser` config enforcing module boundaries, no cycles, "only repositories import Prisma"
- [ ] **0.5** CI workflow (GitHub Actions): install → prisma validate → lint → typecheck → depcruise → tests (Postgres service) → coverage gates → build
- [ ] **0.6** ESLint rules: max-lines, max-lines-per-function, complexity, max-params, no-explicit-any; Prettier; commit-msg lint
- [ ] **0.7** Introduce repository layer pattern on `vendors` (template for new modules): extract `vendor.repository.ts`, `vendor.policy.ts`, `vendor.mapper.ts`; add module `index.ts` public API
- [ ] **0.8** Test infrastructure: builders (`buildUser`, `buildVendor`, `buildRfq`, `buildQuotation`), DB reset helper, authenticated-request helper per role, query-count helper
- [ ] **0.9** Add request-ID middleware + structured logging (pino) with redaction
- [ ] **0.10** Create `docs/adr/` and write ADRs 0001–0004 (modular monolith, shared package, layering, decimal money)
- [ ] **0.11** Move Week 1 docs to `docs/week-1/`, add Week 2 docs to `docs/week-2/`

**Exit:** CI green on a clean clone; vendor module follows the new layout; boundary check passes; no behavior change for users.

## Phase 1 — Database and Domain Core (≈ 1 day)

- [ ] **1.1** Prisma migration: `Counter`, `Rfq`, `RfqItem`, `RfqVendor`, `Quotation`, `QuotationItem`, `QuotationRevision`, `RfqAttachment`, `VendorMember`, `Vendor.rating`
- [ ] **1.2** Raw SQL migration: composite FK for selected quotation, CHECK constraints, indexes (`architecture.md` §4.3, §12); verify it applies on empty DB **and** Week 1 seeded DB
- [ ] **1.3** `shared`: Zod schemas for RFQ create/update, line items, quotation upsert, comparison query, vendor-member link; DTO types per audience
- [ ] **1.4** `shared`: `computeQuotationTotals` (decimal.js, half-up) + golden tests (`169500 / 30510 / 200010`)
- [ ] **1.5** `shared`: RFQ transition table + `effectiveRfqStatus(rfq, now)` + table-driven tests
- [ ] **1.6** `shared`: new error codes; extend permission map (`rfq:*`, `quotation:*`, `vendorPortal:use`)
- [ ] **1.7** Seed: extend with vendor-user accounts linked to vendors, ratings on vendors, 3 sample RFQs in different states with quotations
- [ ] **1.8** DB-level integrity tests: composite FK rejects mismatched RFQ/vendor/item; unique (RFQ, vendor); CHECK constraints

**Exit:** migrations applied; pure domain logic fully tested; integrity violated at SQL level is rejected.

## Phase 2 — Vendor Linking and Rating (≈ 0.5 day)

- [ ] **2.1** `vendors` module: `VendorMember` repository/service; `GET/POST/DELETE /vendors/:id/members`; only Vendor-role users; one vendor per user (409 otherwise)
- [ ] **2.2** `vendors`: accept/validate `rating`; expose `getVendorIdsForUser(userId)` in the module public API
- [ ] **2.3** Tests: matrix for new routes; unlinking; duplicates; rating bounds
- [ ] **2.4** Audit events: member linked/unlinked

## Phase 3 — Attachments Infrastructure (≈ 0.75 day)

- [ ] **3.1** `attachments` module: upload service (multer stream limits, magic-byte check, allow-list, size/count caps, sanitized names, random keys)
- [ ] **3.2** Download endpoint with authorization hook (callable by rfq/vendor-portal policies) and `Content-Disposition: attachment`
- [ ] **3.3** Delete (soft) + storage cleanup via event handler
- [ ] **3.4** Rate limit uploads (per user); env vars for limits
- [ ] **3.5** Tests: wrong type, spoofed extension, oversize, too many files, unauthorized download, path traversal in filename

## Phase 4 — RFQ Backend (≈ 2 days)

- [ ] **4.1** `rfqs` module scaffolding in standard layout (routes/controller/service/repository/policy/mapper/events/state)
- [ ] **4.2** Counter-based code allocation `RFQ-YYYY-NNNN` (atomic, concurrency test with parallel creates)
- [ ] **4.3** `POST /rfqs` (draft or `publish:true` in one transaction); validation BR-2/3
- [ ] **4.4** `GET /rfqs` (search by code/title, status/category/date filters, pagination, sorting, `counts`) with indexes; query-count test
- [ ] **4.5** `GET /rfqs/:id` (officer DTO: items, vendors + per-vendor state, attachments, `effectiveStatus`)
- [ ] **4.6** `PATCH /rfqs/:id` with `version` check and field rules per status (BR-13); ownership policy
- [ ] **4.7** Lifecycle endpoints: publish, close, reopen (future deadline), cancel (reason), soft delete (draft only) — all via transition table
- [ ] **4.8** Vendor assignment endpoints (add/remove); Active-only, caps, BR-15
- [ ] **4.9** Domain events: `RfqPublished`, `RfqClosed`, `RfqCancelled`; audit handler writes entries
- [ ] **4.10** Tests: role × endpoint × state matrix; invalid transitions → 409; stale version → 409; Manager read-only; officer cannot edit another officer's RFQ (Admin can)

**Exit:** full RFQ lifecycle works via API with correct permissions.

## Phase 5 — Vendor Portal and Quotations Backend (≈ 2 days)

- [ ] **5.1** `rfqs` public API: `findForVendor(rfqId, vendorIds)`, `listForVendor(vendorIds)`, `markViewed`
- [ ] **5.2** `vendor-portal` module: `GET /vendor-portal/rfqs`, `GET /vendor-portal/rfqs/:rfqId` (vendor-safe DTO whitelist; `404` for unassigned; sets `viewedAt` once)
- [ ] **5.3** Attachment download via vendor-portal (assigned + published only)
- [ ] **5.4** `quotations` module scaffolding; `GET/PUT /vendor-portal/rfqs/:rfqId/quotation`
- [ ] **5.5** Upsert logic: BR-4 (clock vs deadline, inside transaction), BR-5, BR-6 (all items priced on submit, drafts partial), BR-7 (server totals), BR-8, BR-11 (revision snapshot on every submit/edit), BR-16 (blocked vendor)
- [ ] **5.6** Optimistic locking (`version`) and `VERSION_CONFLICT`
- [ ] **5.7** Events: `QuotationSubmitted` (and `QuotationUpdated`); audit handler
- [ ] **5.8** **IDOR/permission matrix tests:** vendor A vs vendor B vs unassigned vendor vs unlinked vendor vs staff on every vendor-portal route; direct-ID guessing; quote on draft/cancelled RFQ
- [ ] **5.9** Deadline tests with `FixedClock`: 1 s before accepted, at/after rejected, edit after deadline rejected; RFQ status derived as CLOSED
- [ ] **5.10** Tests: line-item mismatch (item from a different RFQ) rejected in service and DB; client-sent totals ignored

**Exit:** two vendors can quote the same RFQ via API; cross-vendor access impossible; deadline enforced.

## Phase 6 — Comparison, Selection, Jobs, Notifications (≈ 1.5 days)

- [ ] **6.1** `comparison` module: `comparison.rules.ts` (`isComparable`, `lowestIds` with ties) + unit tests
- [ ] **6.2** `GET /rfqs/:id/comparison` with sort/filter params; returns criteria data, `lowestQuotationIds`, `hiddenLowest` hint, rating (or null); single-query load; query-count test; 20-column cap
- [ ] **6.3** `PUT/DELETE /rfqs/:id/selection` with `FOR UPDATE` lock, validity checks (BR-12, BR-16), `QuotationSelected` event; persist `selectedQuotationId/By/At`
- [ ] **6.4** Feature flag `SEALED_BIDS` (default off) wired into comparison visibility
- [ ] **6.5** `jobs/expire-rfqs.ts` with advisory lock, batch processing, `RfqClosed` events; test multi-instance safety (two concurrent runs)
- [ ] **6.6** `notifications` handlers (non-fatal): vendors on publish; officer on quotation submit; templates with `APP_BASE_URL` links (no tokens in links)
- [ ] **6.7** Dashboard: `activeRfqs` real, role-scoped via `rfqs` public API
- [ ] **6.8** Tests: comparison correctness (tie, hidden lowest, drafts excluded, blocked vendor excluded), selection race (two selects), job closes expired RFQs once

**Exit:** compare + select works via API; job and notifications run safely.

## Phase 7 — Frontend Foundation for Week 2 (≈ 1 day)

- [ ] **7.1** New UI components: `Stepper`, `LineItemsEditor`, `VendorPicker`, `FileDropzone`, `DateTimePicker`, `MoneyInput`, `DeadlineBadge`, `RatingIndicator`, `RfqSummaryBox`, `QuoteTotalsPanel`, `UnsavedChangesGuard` (component tests)
- [ ] **7.2** Format utilities: INR grouping, date/time with timezone, countdown
- [ ] **7.3** Feature folders `features/rfqs`, `features/quotations`, `features/comparison` with `api.ts`, `queryKeys.ts`, `hooks.ts` (typed with shared DTOs)
- [ ] **7.4** Router: activate `/rfqs`, `/rfqs/new`, `/rfqs/:id`, `/rfqs/:id/edit`, `/rfqs/:id/compare`, `/quotations`, `/quotations/rfq/:rfqId`; lazy-load create/compare; role guards (UX only)
- [ ] **7.5** Sidebar: activate RFQ's and Quotations; vendor routing per design §6
- [ ] **7.6** Global handler for `VERSION_CONFLICT` and `RFQ_DEADLINE_PASSED`

## Phase 8 — RFQ UI (≈ 1.5 days)

- [ ] **8.1** Create RFQ page (Screen 5): form with shared Zod schema, line items editor, vendor picker (async, Active only), date-time picker, dropzone, stepper (desktop sections / mobile steps)
- [ ] **8.2** Save as Draft and Save & Send (confirm dialog); attachment upload after create with retry; unsaved-changes guard
- [ ] **8.3** Edit RFQ (draft: full; open: restricted fields)
- [ ] **8.4** RFQ list page: search, chips with counts, table, pagination, URL-synced state, all states
- [ ] **8.5** RFQ detail page: sections, per-vendor status table, action bar by state, dialogs (cancel reason, reopen deadline)
- [ ] **8.6** Vendor drawer: Portal users section; rating field in vendor form
- [ ] **8.7** Component and form tests (field array, validation mapping, disabled reasons)

## Phase 9 — Vendor Quotation UI (≈ 1 day)

- [ ] **9.1** Quotations hub: vendor list (statuses/actions) and staff list (Compare entry)
- [ ] **9.2** Submit Quotations page (Screen 6): RFQ summary, quote table, Tax/GST %, notes, payment terms, totals panel, live preview via shared calculator
- [ ] **9.3** States: new, draft, submitted-editable, read-only after deadline, blocked, version conflict; confirm dialog on submit
- [ ] **9.4** Unlinked-vendor empty state
- [ ] **9.5** Tests: live totals equal mockup values; read-only after deadline; submit validation

## Phase 10 — Comparison UI and Dashboard (≈ 1 day)

- [ ] **10.1** `ComparisonTable` (Screen 7): criteria rows, vendor columns, lowest highlight + badge, sticky column, mobile card layout
- [ ] **10.2** Toolbar: sort, filters, reset, filter chips, hidden-lowest hint
- [ ] **10.3** Selection flow: confirm dialog, selected badge, change selection; Manager read-only
- [ ] **10.4** Line-item breakdown (collapsible)
- [ ] **10.5** Empty/loading/error/filtered-out states
- [ ] **10.6** Dashboard: Active RFQ's real value + link; `+ New RFQ` enabled per role
- [ ] **10.7** Component tests for table states and highlight logic from API data

## Phase 11 — Quality, Security, Scale Checks (≈ 1 day)

- [ ] **11.1** Playwright E2E: officer creates + publishes → vendor A, B submit → vendor C denied → vendor A edits → compare shows lowest → select → refresh persists; deadline case with short deadline
- [ ] **11.2** Manual security pass with curl/Postman: IDOR on every vendor-portal and attachment route, expired token, tampered IDs, spoofed upload, XSS payloads in title/notes
- [ ] **11.3** Performance check: seed 10k RFQs / 100k quotations (script), verify list/compare latency and `EXPLAIN` use indexes; record numbers in `memory.md`
- [ ] **11.4** Verify query-count assertions and coverage gates in CI
- [ ] **11.5** `npm audit`; secrets scan; confirm client bundle has no secrets and initial JS within budget
- [ ] **11.6** Accessibility pass on three screens (keyboard, focus, contrast, table semantics)
- [ ] **11.7** Tech-debt review; write ADRs 0005–0010

## Phase 12 — Submission Package (≈ 0.5 day)

- [ ] **12.1** README: new env vars, storage setup, migration/seed steps, demo accounts per role (dev only), run/test commands, architecture overview link
- [ ] **12.2** Screenshots/video of the full workflow (see `prd.md` §6)
- [ ] **12.3** Completion report: features, tests run (with results), known limitations, deviations
- [ ] **12.4** Optional deploy preview (storage driver and cookie settings verified)
- [ ] **12.5** Final check against acceptance criteria; tag `week-2`; push

---

## Acceptance Verification

| # | Criterion | Verified by |
|---|---|---|
| 1 | Officer creates RFQ with items, deadline, attachment, multiple vendors | Manual + E2E |
| 2 | Unique readable RFQ IDs; statuses and deadlines in list | Tests + manual |
| 3 | Vendors see only their assigned RFQs; others get 404 | IDOR matrix + curl |
| 4 | Vendors submit quotations; edit before deadline; rejected after | Clock tests + manual |
| 5 | Quotations cannot attach to wrong RFQ/vendor | Service + DB constraint tests |
| 6 | Comparison uses real data; lowest highlighted; sort/filter/empty states | Component + API tests + manual |
| 7 | Selected quotation persisted and identifiable | DB check + refresh test |
| 8 | Data persists across refresh/sessions | E2E |
| 9 | CI green (lint, types, boundaries, tests, build) | GitHub Actions |
| 10 | README, demo evidence, completion report | Submission review |

## Scalability and Maintainability Exit Checklist

- [ ] No module imports another module's internals (depcruise green)
- [ ] Only repositories import Prisma
- [ ] No contract duplicated between client and server (all in `shared/`)
- [ ] Every new list query has an index and a pagination cap
- [ ] Query-count tests pass for list, detail, comparison
- [ ] Money uses Decimal end to end; time uses Clock
- [ ] Side effects run via events and never fail requests
- [ ] ≤ 5 open items in the tech-debt register
- [ ] ADRs 0001–0010 written

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Phase 0 refactor delays features | Timebox to 1.5 days; vendors module is the only migrated one; log other legacy code as debt |
| Composite-FK / raw SQL migrations drift from Prisma | Separate named migration, CI applies on empty + seeded DB, integrity tests |
| Vendor-portal data leaks via shared DTOs | Whitelist mappers, IDOR matrix as merge gate |
| File uploads are an attack surface | Magic-byte validation, caps, authenticated downloads, rate limit |
| Ambiguous stepper/labels | Decisions logged; confirm early (`memory.md` §6) |
| Scope creep into approvals | Selection only; Week 3 hooks are events and columns, not features |
| Time overrun | Cut order: line-item breakdown, trigram index, performance seeding, deploy |

## Backlog / Hooks for Week 3+ (do not build now)
Approval workflow subscribing to `QuotationSelected` · RFQ statuses `PENDING_APPROVAL/APPROVED/REJECTED` · restore "Select & Approve" label · PO generation from selected quotation · vendor decline · sealed-bid mode · comparison export · queue-backed notifications · S3 presigned uploads · activity log UI.
