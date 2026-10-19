# VendorBridge — Design Specification (Week 1)

Source of truth: the VendorBridge Excalidraw mockup. This document translates the wireframes (Screens 1–4 in scope, 5–11 as nav/placeholder context) into implementable UI. Do not remove specified features or restructure layouts without approval.

## 1. Visual Language

The mockup uses a **dark theme with green accents**: near-black canvas, thin light-gray outlines, and a solid green highlight on the active sidebar item.

### Design tokens (Tailwind theme extension)

| Token | Value | Use |
|---|---|---|
| `bg-canvas` | `#0B0D0C` | Page background |
| `bg-surface` | `#121614` | Cards, panels, sidebar |
| `bg-surface-2` | `#1A1F1C` | Inputs, table header, hover |
| `border-default` | `#2E3532` | Outlines (mockup's thin gray borders) |
| `text-primary` | `#F4F6F5` | Headings, body |
| `text-secondary` | `#9AA5A0` | Subtitles, helper text |
| `text-muted` | `#6B7671` | Placeholders |
| `brand` | `#15803D` | Active nav, primary buttons (mockup green) |
| `brand-hover` | `#16A34A` | Hover/focus |
| `brand-subtle` | `#052E16` | Tinted backgrounds |
| `success` | `#22C55E` | Active status |
| `warning` | `#F59E0B` | Pending status |
| `danger` | `#EF4444` | Blocked status, destructive actions |
| `info` | `#3B82F6` | Info, links, step highlight |

Contrast: all text/background pairs must meet WCAG AA (4.5:1 body, 3:1 large text).

### Typography
- Font: **Inter** (fallback system-ui). The mockup's hand-drawn font is an Excalidraw artifact, not a requirement.
- Scale: Page title 24/32 semibold · Section title 18/28 semibold · Body 14/20 · Caption 12/16 · Card number 28/32 bold.

### Spacing, shape, elevation
- 4px base grid (4, 8, 12, 16, 24, 32).
- Radius: inputs/buttons 8px, cards 12px, modals 16px.
- Borders over shadows (matches wireframe); subtle shadow only on modals/drawers.
- Focus ring: 2px `brand-hover` with 2px offset.

## 2. Layout System

### App shell (Screens 3–11)
```
┌──────────────────────────────────────────────────────────┐
│ Topbar: "VendorBridge" brand ........ user menu (○)      │
├───────────────┬──────────────────────────────────────────┤
│ Sidebar       │ Page header (title + subtitle)  [Action] │
│  - Dashboard  │──────────────────────────────────────────│
│  - Vendors    │ Page content                             │
│  - RFQ's      │                                          │
│  - Quotations │                                          │
│  - Approvals  │                                          │
│  - Purchase.. │                                          │
│  - Invoices   │                                          │
│  - Reports    │                                          │
│  - Activity   │                                          │
└───────────────┴──────────────────────────────────────────┘
```
- Topbar: brand left; circle at far right in the mockup becomes the **user avatar menu** (name, role, Logout).
- Sidebar width 240px; item list in mockup order; active item has solid `brand` background and white text. Items hidden per role (architecture §8).
- Content max-width 1280px, 24–32px padding.

### Responsive behavior
| Breakpoint | Behavior |
|---|---|
| ≥ 1024px | Sidebar fixed, full layout |
| 768–1023px | Sidebar collapses to icon rail or drawer; cards 2 columns |
| < 768px | Hamburger opens sidebar drawer; cards 1 column; tables become horizontally scrollable or stacked cards |

## 3. Screens in Scope

### Screen 1 — Login
Centered card on `bg-canvas` (max-width 400px).
- Top: brand mark (replaces "Photo" placeholder), title "Sign in".
- Fields: **Email** (mockup says Username; see PRD deviation #1), **Password** (show/hide toggle).
- Primary button: **Login** full width.
- Links: "Forgot password?" and "Create an account".
- States: field errors inline, form-level error banner for invalid credentials, button loading spinner, disabled while submitting.

### Screen 2 — Registration
Centered card (max-width 640px), two-column grid on desktop, one column on mobile.

| Row | Left | Right |
|---|---|---|
| 1 | First Name | Last Name |
| 2 | Email Address | Phone Number |
| 3 | Role (select: Admin, Procurement Officer, Manager/Approver, Vendor) | Country |
| 4 | Password | Confirm Password *(added)* |
| 5 | Additional Information (textarea, full width, optional) | |
| 6 | Invite code (appears only when Admin is selected) *(added)* | |

- Footer: **Register** button centered; link "Already have an account? Login".
- Password helper text lists the policy; inline strength hint.
- Success: redirect to login with success toast (or auto-login, decided in `memory.md`).

### Forgot / Reset password (added, minimal)
Same card style as login. Forgot: email field + "Send reset link" + generic success message. Reset: new password + confirm, with invalid/expired token error state.

### Screen 3 — Dashboard
Header: **"Dashboard"**; subtitle **"Welcome back, {Role label}, Today's Overview"** (e.g., "Welcome back, Procurement Officer").

**Summary cards (row of 4)**

| Card | Mockup sample | Week 1 value | Helper |
|---|---|---|---|
| Active RFQ's | 12 | 0 | "RFQs arrive in Week 2" |
| Pending Approvals | 5 | 0 | "Approvals arrive in Week 3" |
| PO's this month | ₹2.3L | ₹0 | "Purchase orders arrive in Week 4" |
| Overdue invoices | 3 | 0 | "Invoices arrive in Week 4" |

Card: bordered surface, large number on top, label beneath, optional small helper text. Numbers formatted in INR (₹, lakh notation allowed).

**Content row (two panels)**
- **Recent Purchase Orders** (left, wider): table columns PO#, Vendor, Amount, Status. Empty state: icon + "No purchase orders yet" + helper text.
- **Spending Trends — last 6 months** (right): chart panel. Empty state: "Spending data will appear once purchase orders exist."

**Quick actions (bottom row of 3 outlined buttons)**
- `+ New RFQ` → disabled with tooltip "Coming in Week 2"
- `Add Vendor` → opens Add Vendor form (hidden/disabled for roles without `vendor:create`)
- `View Invoices` → navigates to the Invoices coming-soon page

### Screen 4 — Vendors
Header: **"Vendors"**, subtitle **"Manage supplier profiles and registrations"**, top-right **"+ Add Vendor"** button (only for Admin/Officer).

1. **Search bar** (full width): placeholder "Search by name, GST number, category…" — debounced 300ms, synced to URL.
2. **Filter chips** with counts: `All (29)`, `Active (21)`, `Pending (4)`, `Blocked (3)`. Selected chip uses `brand` tint. Optional category select next to chips.
3. **Table**

| Column | Content |
|---|---|
| Vendor Name | Name (truncate with tooltip) |
| Category | Text |
| GST No. | Monospace |
| Contact No. | Phone |
| Status | Badge |
| Action | `View` button; kebab menu with Edit, Delete (role-dependent) |

4. **Pagination** footer: "Showing 1–10 of 29", prev/next, page size select.
5. **View vendor** → right-side drawer with all details (name, category, GST, contact person/email/phone, address, notes, status, created by/at, updated at) and Edit button.
6. **Add / Edit vendor** → modal form:

| Field | Type | Required | Validation |
|---|---|:-:|---|
| Vendor name | text | ✅ | 2–120 chars |
| Category | select | ✅ | from category list |
| GST number | text (auto-uppercase) | ✅ | 15-char GSTIN regex; unique |
| Contact person | text | ✅ | 2–80 chars |
| Contact email | email | ✅ | valid email |
| Contact phone | tel | ✅ | 10-digit or E.164 |
| Address | textarea | ❌ | ≤ 300 chars |
| Notes | textarea | ❌ | ≤ 500 chars |
| Status | select | ✅ | Active / Pending / Blocked (default Pending) |

7. **Delete** → confirmation dialog naming the vendor; Admin only.

## 4. Placeholder Screens (Screens 5–11)

Navigation items for RFQ's, Quotations, Approvals, Purchase orders, Invoices, Reports, Activity render a shared `ComingSoon` page: page title (matching sidebar label), icon, "This module arrives in Week N", and a "Back to dashboard" button. Do not draw the real screens' content.

Reference for later weeks (do not build now): RFQ 3-step wizard (5), quotation entry (6), comparison table with green lowest-price column (7), 4-step approval chain (8), PO/invoice document (9), audit timeline with immutable entries (10), spend analytics (11).

## 5. Component Library

| Component | Variants / notes |
|---|---|
| `Button` | primary, outline, ghost, danger; sizes sm/md; loading, disabled |
| `Input`, `Select`, `Textarea`, `PasswordInput` | label, helper, error, required marker |
| `Badge` / `StatusBadge` | Active (green), Pending (amber), Blocked (red); dot + text |
| `Card`, `StatCard` | bordered surface; StatCard = value + label + helper |
| `DataTable` | header, rows, loading skeleton, empty, error, pagination |
| `FilterChips` | single-select with counts |
| `SearchInput` | debounce, clear button |
| `Modal`, `Drawer`, `ConfirmDialog` | focus trap, Esc to close, aria roles |
| `EmptyState` | icon, title, description, optional action |
| `Toast` | success, error, info |
| `Sidebar`, `Topbar`, `AppShell` | role-aware nav |
| `Skeleton`, `Spinner` | loading |
| `ComingSoon` | placeholder module page |

## 6. UX States and Copy

| State | Treatment |
|---|---|
| Loading | Skeleton rows/cards, never a blank screen |
| Empty (no vendors) | "No vendors yet. Add your first vendor." + Add Vendor (if permitted) |
| Empty (no results) | "No vendors match your search." + Clear filters |
| API error | Inline error panel with Retry |
| Forbidden | "You don't have permission to view this page." + back to dashboard |
| Session expired | Redirect to login with "Please sign in again" toast |
| Form submit success | Toast, modal closes, list refreshes |

Tone: concise, professional, no jargon. Currency ₹; dates `DD MMM YYYY`.

## 7. Accessibility Checklist
- All inputs have visible labels (not placeholder-only) and `aria-invalid` + described error text.
- Status conveyed by text + color.
- Modals/drawers trap focus, restore focus on close, close with Esc.
- Tables use proper `<th scope>`; row actions reachable by keyboard.
- Minimum touch target 40px; focus ring always visible.
- Respect `prefers-reduced-motion`.

## 8. Design QA Checklist
- [ ] Sidebar order and labels match the mockup exactly
- [ ] Active nav highlight is green
- [ ] Dashboard shows 4 cards, recent POs panel, spending panel, 3 quick actions
- [ ] Vendors page shows search, 4 chips with counts, 6-column table, "+ Add Vendor"
- [ ] Registration contains every mockup field
- [ ] Empty states present for all future-week data
- [ ] Verified at 375px, 768px, 1280px widths
