# VendorBridge — Engineering Rules (Week 2)

All Week 1 rules still apply (backend is the authority, no fake features, no secrets in the client, Conventional Commits, role × endpoint tests, etc.). This document **adds** the rules that keep the codebase maintainable and scalable as Weeks 3–4 land. Rules are written so they can be checked by a tool or a reviewer; where possible CI enforces them.

## 1. Golden Rules (Week 2)

1. **Real data only.** No hardcoded RFQs, quotations, or comparison data anywhere outside seed scripts and tests.
2. **Every quotation belongs to the right RFQ and vendor** — enforced by service logic **and** database constraints.
3. **Server computes, client previews.** Totals, lowest price, effective status, and permissions are authoritative on the server.
4. **Vendors see only their own data.** Object-level access is a query constraint, not a post-fetch `if`.
5. **Change structure deliberately.** New behavior goes into the established module layout; do not invent parallel patterns. If a pattern must change, write an ADR first.
6. **Stay in scope.** No approvals, POs, invoices, reports, or audit UI.

## 2. Maintainability Rules

### 2.1 Module boundaries
- Server code lives in `modules/<name>/`. Other modules may import **only** from `modules/<name>/index.ts`.
- Never import another module's `*.repository.ts`, `*.service.ts` internals, or Prisma models directly.
- No circular dependencies. Direction for Week 2: `quotations → rfqs → vendors`; `comparison` and `vendor-portal` sit on top. A lower module that needs to react to a higher one uses a **domain event**.
- `dependency-cruiser` runs in CI; a violation fails the build. Do not add exceptions without an ADR.
- Client code lives in `features/<name>/`. Features do not import each other's internals; shared things go to `components/ui`, `lib/`, or `@vendorbridge/shared`.

### 2.2 Layering (server)
| Layer | Allowed | Forbidden |
|---|---|---|
| `routes` | Path, middleware, controller wiring | Logic |
| `controller` | Parse input with shared schema, call one service function, map to DTO, respond | Business rules, Prisma, multiple service orchestration |
| `service` | Use cases, transactions, rule checks, emit events | `req`/`res`, SQL/Prisma calls, building HTTP responses |
| `repository` | **All** Prisma access, explicit `select`/`include`, scoping helpers | Business rules, throwing HTTP errors |
| `policy` | Pure `(user, entity) → boolean` object-level rules | I/O |
| `mapper` | Entity → audience DTO | Queries |
| `domain` pure functions | Totals, state transitions, comparison rules | Imports from Express, Prisma, or React |

- Dependencies are **injected** (constructor/factory args) and wired in `container.ts`. Modules never call `new PrismaClient()`, `new Date()`, or read `process.env` directly.
- Use the `Clock` for "now", `StorageProvider` for files, `Mailer` for email, `EventBus` for side effects.

### 2.3 Shared contracts
- Enums, limits, Zod schemas, DTO types, error codes, permission map, state tables, and the totals calculator live **only** in `shared/`.
- Never redefine a type or validation rule that exists in `shared/`. Never copy constants between client and server.
- `shared/` has no Node- or browser-specific APIs and no dependency beyond `zod` and `decimal.js`.
- A change to `shared/` that alters a contract requires updating tests on both sides in the same PR.

### 2.4 DTOs and API hygiene
- Entities (Prisma types) never cross the service boundary outward. Controllers return mapper-built DTOs.
- Separate DTOs per audience (`RfqOfficerDto`, `RfqVendorDto`). Vendor DTOs must be built from a whitelist, not by deleting fields from the officer DTO.
- Request bodies use `.strict()` schemas (unknown fields rejected).
- Additive API changes only within `/api/v1`; breaking changes require `/api/v2` and an ADR.
- Every list endpoint is paginated (default 10–20, max 100) and has a deterministic sort with a unique tiebreaker (`id`).

### 2.5 Size and complexity limits (lint-enforced where possible)
| Item | Limit |
|---|---|
| File length | ≤ 300 lines (soft), 400 (hard; justify in PR) |
| Function length | ≤ 50 lines |
| Cyclomatic complexity | ≤ 10 per function |
| Function parameters | ≤ 4 (use an options object beyond that) |
| React component | ≤ 200 lines; extract hooks and subcomponents |
| Nesting depth | ≤ 3 |

### 2.6 Naming and style
- Files: components `PascalCase.tsx`; everything else `kebab-case` with role suffix (`rfq.service.ts`, `rfq.policy.ts`, `use-rfqs.ts`).
- Functions are verbs (`publishRfq`, `computeQuotationTotals`); booleans are questions (`isLowest`, `canEdit`).
- No abbreviations except well-known ones (`id`, `dto`, `rfq`, `url`).
- No `any`, no non-null `!` without a comment, no `@ts-ignore` (use `@ts-expect-error` with reason).
- No dead code, commented-out code, TODOs without an issue/tasks.md reference.
- Constants are named and live in `shared/constants`; no magic numbers (`10 * 1024 * 1024` → `UPLOAD_MAX_BYTES`).

### 2.7 Error handling
- Throw typed `AppError` subclasses from services/domain; only the central `errorHandler` converts to HTTP.
- Use codes from `shared/errors.ts`; never invent ad-hoc strings. Add a new code there, document it in `architecture.md` §7.5.
- Never swallow errors. Event handlers catch, log with context (`requestId`, entity id), and continue.
- Never leak internals (stack traces, SQL, storage paths) in responses.

### 2.8 Documentation
- Public functions of a module (`index.ts` exports) have a one-line JSDoc stating the contract and thrown error codes.
- Comments explain **why** (a business rule ID like `BR-4`), not what.
- Any non-obvious rule references its ID from `prd.md` §3a in code and tests (`// BR-4: deadline enforced by server time`).
- Decisions that cost more than a day to reverse get an ADR in `docs/adr/`.

## 3. Scalability Rules

### 3.1 Data and queries
- **No N+1.** Fetch related rows with `include/select` or a batched `IN` query. Query-count tests exist for list, detail, and comparison.
- **Select only what you need** — no `SELECT *` into DTOs, no loading blobs/JSON snapshots in lists.
- **Pagination or hard caps** on every collection. Child collections are capped by validation (items ≤ 50, vendors ≤ 20, attachments ≤ 5, comparison ≤ 20 columns).
- **Index with the query.** Any new filter/sort column used in a list endpoint ships with an index in the same migration and a note in `architecture.md` §12.
- **No unbounded in-memory processing** of table data. Aggregations happen in SQL.
- **Transactions** for any multi-row write; keep them short; no network calls (email, storage) inside a transaction.
- Concurrency: writes to RFQ/quotation require `version` (optimistic lock); state-changing operations lock the RFQ row (`FOR UPDATE`) when rules depend on other rows (selection, publish).
- Counters/sequences are allocated atomically in the DB — never `max(id)+1`.

### 3.2 Statelessness and infrastructure
- No server-side in-memory state that matters (caches, sessions, upload buffers beyond a request). The API must run as N identical instances.
- Files only through `StorageProvider`; never write to arbitrary paths; never serve from a public static directory.
- Background jobs must be **idempotent** and **multi-instance safe** (advisory lock), and process in bounded batches.
- Side effects go through domain events; handlers are idempotent so a future queue can retry them safely.
- Long or slow work (email, file processing) never blocks the request path.

### 3.3 Money, time, and IDs
- Money: `Decimal` in DB, `string` in JSON, `decimal.js` in code. **Never** `number` arithmetic for currency. Rounding: half-up, 2 decimals, once per line and once for tax.
- Time: store UTC `timestamptz`; compute with the injected `Clock`; display formatting only in the client. Tests for deadlines use `FixedClock`.
- IDs: UUID primary keys internally; human-readable codes (`RFQ-2026-0001`) are display/search identifiers allocated by the DB counter.

### 3.4 Frontend scalability
- Route-level code splitting for heavy pages (create RFQ, comparison).
- Server state in TanStack Query with key factories; no copying server data into global state.
- Lists are paginated; large option lists (vendor picker) use async search combobox, not loading all vendors.
- Memoize only with evidence; prefer structuring components so re-renders are cheap.
- Bundle budget: initial JS ≤ 250 KB gzipped; check in CI (warn) via build output.

## 4. Security Rules (additions)

- Every new route declares: authentication, capability (`authorize`), object-level policy/scoping, validation schema, and rate-limit tier. A PR adding a route without all five is rejected.
- Object-level denial returns `404`; role-level denial returns `403`.
- Vendor-facing queries are **always** constrained by the caller's `vendorIds` inside the repository.
- Uploads: allow-list extensions **and** verify magic bytes; enforce size/count caps; generate storage keys server-side; sanitize display names; force `Content-Disposition: attachment`; authorize every download.
- Do not trust client-sent totals, statuses, vendor IDs for the caller, `deadline` checks, or `isLowest`.
- Do not include other vendors' identities, quotations, or internal notes in any vendor-audience response.
- Audit log entries are written for: RFQ create/publish/close/reopen/cancel/delete, vendor assignment changes, attachment add/remove, quotation save/submit/edit, selection/clear selection, vendor-member link/unlink. Audit remains insert-only.
- Log redaction: never log file contents, cookies, tokens, or full request bodies.

## 5. Database and Migration Rules

- Schema changes only via Prisma migrations; raw-SQL constraints live in a dedicated, named migration file with a comment per statement.
- **Expand → migrate → contract** for any change touching existing columns: add new, backfill, switch code, remove old in a later migration. Never rename/drop in one step.
- Migrations are forward-only and must apply cleanly on an empty DB and on the Week 1 seeded DB (CI checks both).
- Every FK states its `onDelete` intent (`Cascade` for owned children, restrict for references).
- Use CHECK constraints for invariants that are cheap to express.
- Seeds are deterministic and idempotent; demo credentials appear only in README's dev section.

## 6. Testing Rules (additions)

- Pure domain logic (totals, state machine, comparison rules) has table-driven unit tests; the mockup arithmetic (`169500 / 30510 / 200010`) is a golden test.
- Every new route is added to the **role × endpoint × state matrix**; IDOR tests cover vendor A reading/writing vendor B's data and an unassigned vendor.
- Tests that depend on time use `FixedClock`; no `sleep` for deadlines.
- Integration tests use a real Postgres (service container), not mocks, for constraint and concurrency behavior.
- Use test **builders** (`buildRfq`, `buildQuotation`, `buildVendor`), not copied JSON blobs.
- Coverage gates: domain + services ≥ 85%, shared ≥ 90%. Don't game with assertion-free tests.
- A bug fix PR includes a failing-then-passing test.
- Flaky tests are fixed or quarantined with an issue the same day; never retried blindly.

## 7. Git, PR, and Review Rules

- Branches: `feat/rfq-create`, `feat/quotation-submit`, `refactor/shared-package`, `fix/...`. Branch from `main`; rebase before merge.
- PRs are small and single-purpose: **target < 400 changed lines** (excluding generated/migrations/lockfiles). Split larger work (e.g., refactor PR first, feature PR second).
- Refactors and features are **never mixed** in one commit.
- PR description: what/why, linked task IDs, screenshots for UI, migration notes, test evidence, risks.
- CI must be green; at least one self-review pass against the checklist below (or reviewer approval).
- Dependencies: adding a library requires a one-line justification in the PR and `memory.md` (size, maintenance, license, alternatives). Prefer the standard library and existing deps.
- Never commit generated artifacts, uploads (`var/uploads`), `.env`, or large binaries.

### Review checklist
- [ ] Respects module boundaries and layering
- [ ] Uses shared schemas/types; no duplicated rules
- [ ] Route has auth + capability + policy + validation + rate-limit
- [ ] Object-level access scoped in the repository
- [ ] No N+1; new filters/sorts indexed
- [ ] Money via Decimal; time via Clock
- [ ] State changes go through the state machine
- [ ] Errors typed; side effects via events and non-fatal
- [ ] Loading / empty / error states in UI
- [ ] Tests (unit + integration + matrix) and docs updated
- [ ] No secrets, debug code, or dead code

## 8. Tech Debt Policy

- Shortcuts are allowed only if recorded in `memory.md` §9 (Tech Debt Register) with: what, why, impact, payoff trigger, owner.
- At most **5 open debt items** at any time; Week 2 ends with a debt review.
- Anything touching security or data integrity is never deferred.
- "Boy Scout rule": when you touch a Week 1 file for Week 2 work, bring it up to current patterns only if it is within the same PR's scope; otherwise log it as debt.

## 9. Definition of Done (per task)

- [ ] Works UI → API → DB and survives refresh
- [ ] Server-side validation, authorization, and error handling in place
- [ ] Business rules referenced by ID (`BR-n`) and covered by tests
- [ ] Matrix/IDOR tests updated for any route change
- [ ] Lint, typecheck, boundary check, tests, build all green locally and in CI
- [ ] Loading/empty/error states handled; accessible
- [ ] Docs updated (`architecture.md`, README, ADR if applicable)
- [ ] `tasks.md` ticked; `memory.md` decisions/debt updated

## 10. Instructions for AI Coding Assistants

1. Read the six Week 2 docs, then Week 1 docs, before coding. `memory.md` is the live state.
2. Implement tasks in `tasks.md` order; one task per change set. Do the **foundation phase (Phase 0)** before feature work — it is what makes later tasks small.
3. Follow module layout and layering exactly; copy the pattern from the nearest existing module rather than inventing structure.
4. Put contracts in `shared/` first, then server, then client.
5. Never put business logic in controllers or React components; never access Prisma outside repositories.
6. Do not add dependencies, change the stack, or alter the schema outside a task without recording why in `memory.md`.
7. When requirements are ambiguous, check `prd.md` §3a and §9; if still unclear, ask and record the answer as a decision.
8. Run lint, typecheck, boundary check, and tests before claiming done; report failures honestly.
9. Do not weaken constraints, validation, or authorization to make a test or demo pass.
10. Prefer boring, explicit code over clever abstractions. Add an abstraction only when a second concrete use exists or the rules above require it.
