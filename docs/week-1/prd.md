# VendorBridge — Product Requirements Document (Week 1)

**Project:** VendorBridge — Procurement & Vendor Management ERP
**Repository:** `VendorBridge-X-Kagnus` (single repo for all four weekly assignments)
**Milestone:** Week 1 — Foundation & Vendor Management
**Design source of truth:** VendorBridge Excalidraw mockup (11 screens)

---

## 1. Summary

VendorBridge is a procurement ERP that takes a company from vendor onboarding through RFQs, quotations, approvals, purchase orders, invoices, and reporting. Week 1 builds the foundation every later week depends on: **secure authentication with role-based access, the main dashboard shell, and complete vendor management** backed by a real database.

By the end of Week 1 a reviewer must be able to register, log in, see a role-aware dashboard, create/view/update/delete vendors, search and filter them, refresh the page and still see the data, and confirm that restricted roles are blocked **by the backend**.

## 2. Goals and Non-Goals

### Goals
- Working full-stack authentication with sessions, logout, password reset, and four roles.
- Backend-enforced role-based authorization (RBAC) on every protected endpoint.
- Dashboard matching Screen 3, with real empty states for future-week modules.
- Full vendor CRUD with validation, search, status filtering, and status indicators (Screen 4).
- Persistent storage, clean project structure, README, and demo evidence.

### Non-Goals (Week 1)
RFQ creation (Screen 5), quotations and comparison (6, 7), approval workflow (8), PO and invoice generation (9), activity log UI (10), reports and analytics (11). These appear in navigation and show empty states / "coming soon" placeholders only. Do not present static UI for them as implemented features.

## 3. Users and Roles

| Role | Description | Week 1 capability |
|---|---|---|
| **Admin** | System owner | Full vendor CRUD (including delete), all navigation |
| **Procurement Officer** | Day-to-day buyer (primary dashboard persona) | Create, read, update vendors; cannot hard-delete |
| **Manager / Approver** | Approves procurement decisions | Read-only vendor access; dashboard |
| **Vendor** | External supplier user | Dashboard only; no access to vendor management |

### Vendor management permission matrix (enforced on backend)

| Operation | Admin | Procurement Officer | Manager/Approver | Vendor |
|---|:-:|:-:|:-:|:-:|
| List / search / filter vendors | ✅ | ✅ | ✅ | ❌ |
| View vendor detail | ✅ | ✅ | ✅ | ❌ |
| Create vendor | ✅ | ✅ | ❌ | ❌ |
| Update vendor (incl. status) | ✅ | ✅ | ❌ | ❌ |
| Delete vendor | ✅ | ❌ | ❌ | ❌ |

Unauthenticated → `401`. Authenticated but not permitted → `403`.

## 4. Roadmap Context (assumed from design)

Only Week 1 was specified. The later weeks below are an **assumption** inferred from the mockup and should be confirmed.

| Week | Scope |
|---|---|
| 1 | Auth, dashboard, vendors (Screens 1–4) |
| 2 (assumed) | RFQs (Screen 5), vendor quotations (6) |
| 3 (assumed) | Quotation comparison (7), approval workflow (8) |
| 4 (assumed) | PO and invoice (9), activity/audit logs (10), reports (11) |

Week 1 decisions (schema, audit log writes, nav structure) should not block these.

## 5. Functional Requirements

### 5.1 Authentication (Screens 1, 2)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| AUTH-1 | Registration | Form collects first name, last name, email, phone, role, country, additional info, password. Validated client and server. Duplicate email returns a clear error. |
| AUTH-2 | Login | Email + password. Generic error on failure ("Invalid email or password"). Redirects to `/dashboard`. |
| AUTH-3 | Logout | Invalidates the server-side session and clears cookies. Back button cannot reveal protected data. |
| AUTH-4 | Session handling | Short-lived access token + rotating refresh token in `httpOnly` cookies. Expired access token refreshes silently; failed refresh redirects to login. |
| AUTH-5 | Protected routes | Frontend route guards **and** backend middleware. Direct URL access without a session redirects to login. |
| AUTH-6 | Four roles | Procurement Officer, Vendor, Manager/Approver, Admin stored on the user record. |
| AUTH-7 | Backend RBAC | Role checks in API middleware for every protected route. Frontend hiding is cosmetic only. |
| AUTH-8 | Forgot / reset password | Request reset by email → single-use, expiring token link → set new password. Response never reveals whether an email exists. All sessions revoked after reset. |
| AUTH-9 | Admin registration safeguard | Admin role cannot be self-assigned freely; requires a server-side invite code (see Deviations). |

**Password policy:** min 8 chars, at least one uppercase, one lowercase, one number.

### 5.2 Dashboard (Screen 3)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| DASH-1 | Header and greeting | "Dashboard — Welcome back, {Role label}, Today's Overview" using the logged-in user's real name and role. |
| DASH-2 | Summary cards | Four cards: Active RFQ's, Pending Approvals, PO's this month, Overdue invoices. Values come from `GET /dashboard/summary` (0 until later weeks) with a helper line such as "Available in Week 2". |
| DASH-3 | Recent Purchase Orders | Table with PO#, Vendor, Amount, Status. Empty state when no data. |
| DASH-4 | Spending Trends (last 6 months) | Chart container with empty state. Wire up in Week 4. |
| DASH-5 | Quick actions | **+ New RFQ** (disabled, "Coming Week 2"), **Add Vendor** (functional: opens create-vendor flow), **View Invoices** (disabled/placeholder). |
| DASH-6 | Role-aware sidebar | Sidebar items shown per role; active item highlighted green. |
| DASH-7 | Responsive | Sidebar collapses to a drawer on small screens. Cards reflow to 2 then 1 column. |

### 5.3 Vendor Management (Screen 4)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| VEN-1 | Create | "+ Add Vendor" opens a form. Required: name, category, GST number, contact person, contact email, contact phone, status. Optional: address, notes. |
| VEN-2 | List | Table columns: Vendor Name, Category, GST No., Contact No., Status, Action. Paginated. |
| VEN-3 | View | "View" opens a detail view (drawer or page) with all fields, created/updated info. |
| VEN-4 | Update | Edit form prefilled; same validation as create. |
| VEN-5 | Delete | Admin only, with confirmation dialog. Soft delete (see architecture). |
| VEN-6 | Search | Search bar: "search by name, gst number, category…". Debounced; server-side. |
| VEN-7 | Filter | Status chips with counts: All, Active, Pending, Blocked. Optional category filter. |
| VEN-8 | Status indicators | Color-coded badges: Active (green), Pending (amber), Blocked (red). |
| VEN-9 | Validation | GST format `^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$`; email format; phone 10 digits (India) or E.164; unique GST. Field-level errors from API shown inline. |
| VEN-10 | Persistence | Data stored in the database; survives refresh and server restart. |
| VEN-11 | Error handling | Loading, empty, no-results, and API-error states all handled. |
| VEN-12 | Authorization | Per the permission matrix, enforced server-side. |

**Vendor categories (initial list):** IT Hardware, IT Services, Furniture, Stationery, Logistics, Construction, Other.

### 5.4 Placeholder modules

RFQ's, Quotations, Approvals, Purchase orders, Invoices, Reports, Activity appear in the sidebar. Each route renders a consistent **Coming soon / empty state** page naming the week it arrives. Nothing is faked as functional.

## 6. Non-Functional Requirements

- **Security:** hashed passwords (argon2id or bcrypt ≥ 12), httpOnly/Secure/SameSite cookies, CSRF protection, rate-limited auth endpoints, Helmet headers, strict CORS, no secrets in frontend, input validation on every endpoint, parameterized queries via ORM.
- **Maintainability:** clear `client/` and `server/` separation, layered backend (routes → controllers → services → data), reusable UI components, consistent error format.
- **Performance:** list endpoint responds < 300 ms for 1,000 vendors; indexed search columns.
- **Accessibility:** keyboard navigable, labeled inputs, sufficient contrast, focus states.
- **Configuration:** all secrets/config in environment variables with a committed `.env.example`.

## 7. Submission Package (mandatory)

1. Updated GitHub repo `VendorBridge-X-Kagnus` with working source.
2. README: install, configure (env vars), run, test, seed.
3. Screenshots or short video: auth flow, dashboard, vendor CRUD, search/filter, role restriction (403 demo), persistence after refresh.
4. Deployed preview, if deployment is part of the environment.
5. Completion report: features implemented, tests performed, known limitations.

## 8. Definition of Done

A reviewer can verify all of the following:
- [ ] Register, login, logout work end to end.
- [ ] Protected pages redirect when logged out; protected API returns 401.
- [ ] Each role's restrictions are enforced by the API (verified with direct API calls, not just UI).
- [ ] Vendor create, view, update, delete work and validate inputs.
- [ ] Search and status filter return correct records.
- [ ] Vendor data persists across refresh and restart.
- [ ] Dashboard matches the mockup with proper empty states.
- [ ] README, env example, demo evidence, completion report included.

**Not accepted:** static UI shown as a working feature; vendor data lost on refresh; frontend-only role restrictions; missing source, setup instructions, or demo evidence.

## 9. Deviations from Mockup (require approval)

The brief says not to redesign or remove specified features without approval. These are **additions or clarifications** needed to meet the written requirements:

| # | Mockup | Change | Reason |
|---|---|---|---|
| 1 | Login uses "Username" | Field labeled **Email** | Requirements specify email/password login |
| 2 | Registration has no password field | Add **Password** and **Confirm password** | Needed for email/password auth |
| 3 | Registration role dropdown includes Admin | Keep dropdown, but Admin requires an invite code | Prevent privilege escalation via public form |
| 4 | No forgot-password link | Add "Forgot password?" on login | Required by AUTH-8 |
| 5 | Vendors page has no edit/delete controls beyond "View" | Edit and Delete actions available from the Action column / detail view | Required by VEN-4, VEN-5 |
| 6 | "Photo" placeholders on auth screens | Replaced by the VendorBridge logo/brand mark | Placeholder, no feature implied |

## 10. Open Questions

1. Confirm Week 2–4 scope assumptions (Section 4).
2. Should the **Vendor** role be linked to a vendor record (self-service profile) in a later week?
3. Is a hosted deployment expected for Week 1?
4. Currency and locale: assume INR (₹) and Indian GST formats per the mockup.
