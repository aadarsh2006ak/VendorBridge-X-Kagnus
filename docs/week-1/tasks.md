# VendorBridge — Week 1 Task Plan

Legend: `[ ]` todo · `[~]` in progress · `[x]` done. Complete phases in order; each phase ends in something demonstrable. Update this file and `memory.md` after every task.

**Estimated effort:** ~5–7 working days for one developer.

---

## Phase 0 — Project Setup (≈ 0.5 day)

- [x] **0.1** Create GitHub repo `VendorBridge-X-Kagnus`; add `.gitignore`, MIT/none license, branch `main`
- [x] **0.2** Create `docs/` and add `prd.md`, `architecture.md`, `rules.md`, `design.md`, `tasks.md`, `memory.md`
- [x] **0.3** Scaffold `server/` (Express + TS, ts-node-dev/tsx, ESLint, Prettier)
- [x] **0.4** Scaffold `client/` (Vite + React + TS, Tailwind, React Router, TanStack Query)
- [x] **0.5** `docker-compose.yml` with PostgreSQL; `.env.example` files for root/server/client
- [x] **0.6** Husky + lint-staged; npm scripts (`dev`, `build`, `lint`, `test`, `db:migrate`, `db:seed`)
- [x] **0.7** Env parsing with Zod; `/api/v1/health` endpoint including DB check

**Exit:** `docker compose up`, both apps start, health returns ok.

## Phase 1 — Database and Seed (≈ 0.5 day)

- [x] **1.1** Prisma schema: `User`, `Session`, `PasswordResetToken`, `Vendor`, `AuditLog`, enums
- [x] **1.2** Initial migration; partial unique index on `Vendor.gstNumber` where `deletedAt IS NULL`
- [x] **1.3** Seed script: 1 user per role (documented credentials, dev only), ~25 vendors across Active/Pending/Blocked and several categories
- [x] **1.4** Prisma client singleton; audit log service (insert-only)

**Exit:** migration applies cleanly; seed populates data.

## Phase 2 — Backend Authentication (≈ 1.5 days)

- [x] **2.1** Utilities: argon2 hashing, token generation/hashing, JWT sign/verify, cookie helpers
- [x] **2.2** Zod schemas: register, login, forgot, reset
- [x] **2.3** `POST /auth/register` (duplicate email 409, Admin invite-code check, password policy)
- [x] **2.4** `POST /auth/login` (generic error, session row, cookies, audit log)
- [x] **2.5** `POST /auth/refresh` with rotation and reuse detection
- [x] **2.6** `POST /auth/logout` and `GET /auth/me`
- [x] **2.7** `POST /auth/forgot-password` + mailer (Ethereal/Mailtrap/SMTP); generic response; hashed 30-min single-use token
- [x] **2.8** `POST /auth/reset-password` (consume token, update hash, revoke all sessions)
- [x] **2.9** Middleware: `authenticate`, `authorize(permission)`, `validate`, `rateLimit`, central `errorHandler`; Helmet, CORS, CSRF header check
- [x] **2.10** `permissions.ts` map and typed `AppError` classes
- [x] **2.11** Tests: all auth endpoints incl. failures, expired/revoked tokens, rate limit

**Exit:** all auth flows verified via API tests and Postman/curl.

## Phase 3 — Backend Vendor Module (≈ 1 day)

- [x] **3.1** Zod schemas: create, update (partial, strict), list query
- [x] **3.2** `GET /vendors` with search (name, GST, category), status filter, category filter, pagination, sorting, and `counts`
- [x] **3.3** `GET /vendors/:id`
- [x] **3.4** `POST /vendors` (`vendor:create`), GST uniqueness → 409
- [x] **3.5** `PATCH /vendors/:id` (`vendor:update`)
- [x] **3.6** `DELETE /vendors/:id` (`vendor:delete`, soft delete)
- [x] **3.7** `GET /dashboard/summary` (zeros + empty arrays for future modules)
- [x] **3.8** Audit log entries for vendor create/update/delete
- [x] **3.9** **Role × endpoint matrix test** (Admin, Officer, Manager, Vendor, anonymous) for every vendor route
- [x] **3.10** Tests: validation errors, duplicate GST, search/filter correctness, pagination, soft-deleted vendors hidden

**Exit:** matrix test green; vendor API demonstrable without UI.

## Phase 4 — Frontend Foundation (≈ 1 day)

- [x] **4.1** Tailwind theme with design tokens; Inter font
- [x] **4.2** UI kit: Button, Input, Select, Textarea, PasswordInput, Badge/StatusBadge, Card/StatCard, Modal, Drawer, ConfirmDialog, Toast, Skeleton, EmptyState
- [x] **4.3** Axios instance (`withCredentials`, CSRF header) + refresh-on-401 interceptor
- [x] **4.4** Auth context/hooks (`useMe`, `useLogin`, `useLogout`); `ProtectedRoute` and `RoleRoute`
- [x] **4.5** `AppShell`, `Sidebar` (role-aware, mockup order, green active state), `Topbar` with user menu and logout
- [x] **4.6** Router with all paths; `ComingSoon` pages for RFQ's, Quotations, Approvals, Purchase orders, Invoices, Reports, Activity; 404 and 403 pages
- [x] **4.7** Responsive sidebar (drawer < 1024px)

**Exit:** navigable shell with guards; logged-out access redirects to login.

## Phase 5 — Frontend Auth Screens (≈ 0.75 day)

- [x] **5.1** Login page (Screen 1) with validation, error banner, loading state, forgot link
- [x] **5.2** Registration page (Screen 2) with all mockup fields + password/confirm; conditional invite-code field for Admin
- [x] **5.3** Forgot-password and reset-password pages (invalid/expired token handling)
- [x] **5.4** Redirect logic: authed users away from `/login`; post-login to `/dashboard`
- [x] **5.5** Component tests for login and register forms

**Exit:** register → login → logout works in the browser with real sessions.

## Phase 6 — Dashboard (≈ 0.5 day)

- [x] **6.1** `useDashboardSummary` hook
- [x] **6.2** Greeting with real user/role label
- [x] **6.3** Four StatCards (values from API, helper text for future weeks)
- [x] **6.4** Recent Purchase Orders table with empty state
- [x] **6.5** Spending Trends panel with empty state
- [x] **6.6** Quick actions: Add Vendor (functional, permission-aware), New RFQ and View Invoices (disabled/placeholder with tooltips)
- [x] **6.7** Responsive check at 375 / 768 / 1280

**Exit:** dashboard matches Screen 3 with honest empty states.

## Phase 7 — Vendor Management UI (≈ 1.5 days)

- [x] **7.1** Vendors page shell: header, "+ Add Vendor" (permission-aware)
- [x] **7.2** `SearchInput` (debounced) and `FilterChips` with counts, state synced to URL query
- [x] **7.3** `DataTable` with 6 columns, status badges, pagination, loading/empty/no-results/error states
- [x] **7.4** Add/Edit vendor modal (React Hook Form + Zod) with API error → field mapping
- [x] **7.5** View vendor drawer
- [x] **7.6** Delete confirmation (Admin only); toasts on success/failure
- [x] **7.7** Handle 403 for Vendor role (blocked route) and Manager read-only (no create/edit/delete controls)
- [x] **7.8** Query invalidation after mutations; verify persistence after hard refresh
- [x] **7.9** Component tests: vendor form validation, status badge, table empty states

**Exit:** full CRUD, search and filter working through the UI.

## Phase 8 — Quality, Security, and Hardening (≈ 0.5 day)

- [x] **8.1** Smoke verification: register → login → add vendor → refresh → vendor present → search → logout
- [x] **8.2** Manual security pass: direct API calls as each role (curl/Postman), expired token, tampered cookie, XSS payload in vendor name, duplicate GST
- [x] **8.3** `npm audit`; confirm no secrets in repo or bundle (`git grep`, inspect client build)
- [x] **8.4** Accessibility pass (keyboard navigation, focus, labels, contrast)
- [x] **8.5** Lint, type-check, and all tests green on a clean clone

## Phase 9 — Submission Package (≈ 0.5 day)

- [x] **9.1** README: overview, stack, prerequisites, install, env vars table, DB setup/migrate/seed, run, test, demo credentials (dev only), project structure
- [x] **9.2** Screenshots or demonstration evidence: register, login, logout, dashboard, vendor create/view/update/delete, search/filter, 403 role demonstration, refresh persistence
- [x] **9.3** Completion report: implemented features, tests performed (with results), known limitations, deviations from mockup
- [x] **9.4** Optional deployment verification; verify cookies/CORS in development and production build configs
- [x] **9.5** Final review against Acceptance Criteria below; tag `week-1`; push

---

## Acceptance Verification Checklist

| # | Criterion | Verified by |
|---|---|---|
| 1 | Register, login, logout work | Manual + Playwright |
| 2 | Protected pages require authentication | Manual (logged out) |
| 3 | Unauthorized roles blocked on backend | Role matrix test + curl |
| 4 | Dashboard matches design, with empty states | Design QA checklist |
| 5 | Vendor create/view/update/delete work | UI + API tests |
| 6 | Validation and API errors handled | Tests + manual |
| 7 | Search and filter correct | API tests + manual |
| 8 | Data persists after refresh/restart | Manual + Playwright |
| 9 | Password reset works | Manual (mail catcher) |
| 10 | README, env example, demo evidence, report | Submission review |

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Cookie/CORS issues between client and API | Decide origins early; test refresh flow in Phase 4 |
| Password reset email not deliverable in review | Provide Ethereal/Mailtrap config; log link in dev only; document |
| Scope creep into Week 2+ | Follow `rules.md` §1.8; placeholders only |
| Frontend-only authorization slips in | Role matrix test is a merge gate |
| Time overrun | Cut optional items first: category filter, Playwright, deployment |

## Backlog (post Week 1, not to be started now)
RFQ wizard · quotation entry and comparison · approval workflow · PO/invoice generation and PDF · activity log UI · reports and charts · vendor self-service profile · email notifications.
