# VendorBridge — Design Specification (Week 2)

Source of truth: Excalidraw mockup **Screen 5 (Create RFQ's)**, **Screen 6 (Submit Quotations)**, **Screen 7 (Quotation Comparison)**. Week 1 design tokens, app shell, typography, and component rules (`design.md` Week 1) are unchanged. This document specifies only what Week 2 adds. Where the mockup is silent, the choice is marked **(extension)** and listed in `prd.md` §8 for approval.

## 1. Reused from Week 1
Dark canvas, green brand accent, thin outlined surfaces, Inter font, 4px grid, `AppShell` (topbar + role-aware sidebar), `Button`, `Input`, `Select`, `Textarea`, `Card/StatCard`, `StatusBadge`, `DataTable`, `FilterChips`, `SearchInput`, `Modal`, `Drawer`, `ConfirmDialog`, `Toast`, `EmptyState`, skeletons, accessibility rules. Sidebar items **RFQ's** and **Quotations** switch from "Coming soon" to live pages.

## 2. New Design Tokens and Status Colors

| Use | Token | Notes |
|---|---|---|
| Lowest-price column background | `brand` `#15803D` at 90% (mockup solid green) | White text; plus **"Lowest" text badge** (never color-only) |
| Lowest column border | `success` `#22C55E` | |
| Draft | `text-secondary` gray | RFQ & quotation |
| Open | `info` `#3B82F6` | RFQ |
| Closed | `warning` `#F59E0B` | RFQ |
| Quotation Selected | `success` `#22C55E` | RFQ |
| Cancelled | `danger` `#EF4444` | RFQ |
| Invited / Viewed / Quoted | gray / info / success | Vendor assignment state |
| Deadline soon (< 48h) | `warning` | Countdown text |
| Deadline passed | `danger` | |

**Status label spec** (badge = dot + text): `Draft`, `Open`, `Closed`, `Quotation selected`, `Cancelled`; quotation: `Draft`, `Submitted`; per-vendor: `Invited`, `Viewed`, `Quoted`.

## 3. New Components

| Component | Purpose / behavior |
|---|---|
| `Stepper` | 3 numbered circles with connecting line (Screen 5). States: active (filled blue per mockup), complete (check), upcoming (outline). `aria-current="step"`. |
| `LineItemsEditor` | Table (Item, Qty, Unit) with `+ add line item`, per-row remove; keyboard: Enter adds a row. Backed by `useFieldArray`. Max 50. |
| `VendorPicker` | Async combobox (searches **Active** vendors, debounced) + selected **chips with ×**; "+ add vendor" opens the combobox. Max 20; shows "Pending/Blocked vendors can't be invited" helper. |
| `FileDropzone` | Dashed box "Drag & drop files or click to upload"; keyboard-focusable; per-file progress, remove, error (type/size). Lists existing attachments with download. |
| `DateTimePicker` | Date field (e.g. "15 June 2025") + time (default 23:59), displayed in local time with timezone label. |
| `MoneyInput` | Right-aligned, ₹ prefix, 2 decimals, Indian grouping on blur; value kept as string. |
| `DeadlineBadge` | "Closes in 3 days", "Closes today 23:59", "Closed 12 Jun". |
| `RfqSummaryBox` | Bordered box with RFQ title line items summary (Screen 6 "RFQ Summary"). |
| `QuoteTotalsPanel` | Subtotal, GST (n%), Grand total (Screen 6 right-bottom panel). |
| `ComparisonTable` | Transposed table (criteria rows × vendor columns), sticky first column, lowest highlight. |
| `RatingIndicator` | `4.5/5` with star glyph; "Not rated" when null. |
| `ComparisonToolbar` | Sort select + filter controls + reset. |
| `UnsavedChangesGuard` | Warns before leaving a dirty form. |

## 4. Screens

### 4.1 Screen 5 — Create RFQ (`/rfqs/new`)

Header: **"Create RFQ's"**, subtitle **"new request for quotation"**. Below: Stepper `1 — 2 — 3`.

**Desktop layout (matches wireframe): two columns + footer row**

| Left column (Step 1 · Details) | Right column (Step 2 · Items & Vendors) |
|---|---|
| **RFQ's title*** (text, e.g. "Office Furniture procurement Q2") | **Line Items** table: Item · Qty · Unit |
| **Category** (select) | `+ add line item` |
| **Deadline*** (date + time) | **ASSIGN VENDORS** chips (× to remove) |
| **Description** (textarea) | `+ add vendor` |

| Footer (Step 3 · Attachments & Send) | |
|---|---|
| Buttons (left): **Save & Send to Vendors** (primary), **Save as Draft** (outline) | **Attachments**: dashed dropzone "Drag & drop files or click to upload" (right) |

Behavior
- Stepper highlights the section in view/focus and marks sections complete when valid; clicking a step scrolls to it. On < 768px the sections render as one step at a time with Back/Next, and the same two final buttons on step 3.
- **Save & Send** disabled until: title, deadline (future), ≥1 line item with name+qty+unit, ≥1 vendor. Disabled-reason tooltip lists what's missing. Confirms with a dialog: "Send to 3 vendors? Line items can't be changed after sending."
- **Save as Draft** requires only a title.
- Attachments upload after the RFQ id exists: on first save the RFQ is created, then files upload with progress; failures show retry without losing the RFQ.
- Errors: field-level (from API `details`), banner for non-field errors; focus moves to the first invalid field.
- Edit mode (`/rfqs/:id/edit`) reuses the form: Draft = all fields editable; Open = only deadline (extend), description, add vendors/attachments enabled; others read-only with explanatory helper text.

### 4.2 RFQ List (`/rfqs`) — **(extension; Vendors page pattern)**

Header **"RFQ's"**, subtitle "Manage requests for quotation", top-right **"+ Create RFQ"** (Admin/Officer).
Search "Search by RFQ ID or title…". Chips: `All (n)`, `Draft`, `Open`, `Closed`, `Selected`, `Cancelled` with counts.

| Column | Content |
|---|---|
| RFQ ID | `RFQ-2026-0001` (mono) |
| Title | truncate + tooltip |
| Category | text |
| Deadline | date + `DeadlineBadge` |
| Vendors | `quoted / assigned`, e.g. `2 / 3` |
| Status | `StatusBadge` |
| Action | `View`; kebab: Edit (draft), Compare (if ≥1 quote), Close, Cancel, Delete (draft) per state/role |

Pagination, URL-synced filters, loading skeleton, empty ("No RFQs yet" + Create RFQ), no-results, error with Retry. Managers see no mutating actions.

### 4.3 RFQ Detail (`/rfqs/:id`) — **(extension)**

- Header: RFQ ID, title, status badge, `DeadlineBadge`, created by/at.
- Action bar by state: Edit · Publish · Close · Reopen (new deadline dialog) · Cancel (reason dialog) · **Compare quotations** (primary, when ≥1 submitted quote) · Delete (draft).
- Sections: **Requirements** (category, description), **Line items** table, **Attachments** list (download), **Vendors** table (Vendor, rating, status Invited/Viewed/Quoted, submitted at, grand total if quoted, "Vendor blocked" flag), **Selection** card when a quotation is selected (vendor, total, selected by/at).
- Remove-vendor button disabled with tooltip when that vendor has a submitted quote (BR-15).

### 4.4 Quotations hub (`/quotations`)

- **Vendor:** header "Submit Quotations", list of assigned RFQs: RFQ ID, Title, Deadline (+badge), Status (`Awaiting quotation` / `Draft saved` / `Submitted` / `Closed`), Action (`Quote` / `Edit` / `View`). Unlinked vendor account → empty state: "Your account isn't linked to a vendor yet. Ask your procurement contact to link it."
- **Staff:** list of RFQs that have received quotations: RFQ ID, Title, Quotes received, Lowest total, Deadline, Action `Compare` **(extension; thin entry point to Screen 7)**.

### 4.5 Screen 6 — Submit Quotations (`/quotations/rfq/:rfqId`, Vendor)

Header: **"Submit Quotations"**; subtitle **"RFQ: {title} - deadline {date}"** (+ `DeadlineBadge`).

1. **RFQ Summary** box: "RFQ Summary — {Item} × {qty}, … — category {category}". "View details & attachments" link opens a drawer (requirements, attachments).
2. **Your Quotation** table: **Item · Qty · Unit price · Total · Delivery (days)**
   - Item and Qty are read-only (from RFQ). Unit price = `MoneyInput`. Total = read-only computed. Delivery = integer days input.
3. **Tax / GST %** input (default 18, suffix %).
4. **Note / terms** textarea (placeholder "Payment terms: 20 days net…") and **Payment terms (days)** number input *(extension)*.
5. **Totals panel** (right): **Subtotal**, **GST (n%)**, **Grand total**, updating live (client preview; server value shown after save).
6. Buttons: **Submit Quotation** (primary), **Save Draft** (outline).

States
| State | UI |
|---|---|
| New | Empty price cells, defaults (GST 18) |
| Draft saved | Banner "Draft saved — not visible to the buyer until submitted" |
| Submitted, before deadline | Banner "Submitted on {date}. You can edit until {deadline}." Button label becomes **Update Quotation** |
| After deadline / RFQ closed / selected | Read-only, banner explains why; buttons hidden |
| Vendor blocked | Read-only with message "Your account can't submit quotations. Contact the buyer." |
| Version conflict | Dialog: "This quotation changed elsewhere. Reload to continue." |
| Submit validation | Missing prices/delivery highlighted per row; "Price all N items to submit" |

Submit opens a confirm: "Submit quotation for ₹2,00,010? You can edit until {deadline}."
Display check against the mockup sample: 25 × ₹3,500 = ₹87,500; 10 × ₹8,200 = ₹82,000; subtotal ₹1,69,500; GST 18% ₹30,510; grand total ₹2,00,010.

### 4.6 Screen 7 — Quotation Comparison (`/rfqs/:rfqId/compare`)

Header: **"Quotation Comparison"**; subtitle **"RFQ: {title} - {n} quotations received"**. Breadcrumb back to RFQ detail.

**Toolbar (extension for required sort/filter, placed above the table):** Sort by [Price ▾ | Delivery | Rating | Submitted] [↑/↓] · Filters: Max price (`MoneyInput`), Max delivery (days), Min rating, Vendors (multi-select) · **Reset**. Active filters shown as removable chips.

**Table (wireframe):**

| Criteria | **{Vendor 1} (Lowest)** *(green column)* | {Vendor 2} | {Vendor 3} |
|---|---|---|---|
| Grand Total | ₹1,85,000 | ₹2,00,010 | ₹2,14,800 |
| GST % | 18 | 18 | 18 |
| Delivery (days) | 10 | 14 | 7 |
| Vendor rating | 4.5/5 | 4.2/5 | 3.8/5 |
| Payment terms | 30 days | 30 days | 15 days |
| *(button row)* | **Select** | **Select** | **Select** |

- Column header shows vendor name; the lowest column also shows a **"Lowest"** badge and the green background. Ties: every tied column is marked.
- Footer note under the table (as in wireframe): *"Green = lowest price."* Replace the wireframe's "selecting vendor initiates the approval workflow" with *"Selecting a vendor marks it for approval (approval starts in Week 3)."* (see PRD deviation #3).
- Selected quotation column gets a "Selected" badge and the button becomes **Selected ✓** / "Change selection"; confirm dialog before selecting: "Select {vendor} (₹1,85,000)? The RFQ will be closed to further quotation changes."
- **Line-item breakdown** *(extension, collapsed by default)*: rows per item with each vendor's unit price and delivery; lowest unit price per row in bold green.
- Quotations from blocked vendors show a "Vendor blocked" warning and disabled Select; excluded from "Lowest".
- If a filter hides the overall lowest, show an info chip: "Lowest overall (₹1,85,000, Infra Supplies) is hidden by filters".
- Data comes solely from `GET /rfqs/:id/comparison`; the client does not compute totals or the lowest.

States
| State | UI |
|---|---|
| Loading | Table skeleton with column placeholders |
| No quotations | EmptyState "No quotations received yet" + deadline countdown + "Back to RFQ" |
| Only drafts exist | Same, helper "Vendors have saved drafts but not submitted" (count only, no content) |
| All filtered out | "No quotations match your filters" + Reset |
| Error | Inline error with Retry |
| Manager role | Table visible, Select buttons hidden |

Responsive: ≥ 1024px full table (sticky criteria column, horizontal scroll beyond 5 vendors); < 768px each vendor becomes a stacked card with the same rows, lowest card on top with green border + badge, Select button at the bottom.

## 5. Dashboard Changes (Screen 3 delta)

| Item | Week 2 behavior |
|---|---|
| Active RFQ's card | Real count (staff: all Open; vendor: assigned Open); clicking opens `/rfqs` (staff) or `/quotations` (vendor) |
| Pending Approvals / PO's this month / Overdue invoices | Unchanged empty values with helper text (Week 3/4) |
| Quick action **+ New RFQ** | Enabled for Admin/Officer → `/rfqs/new`; hidden for Manager/Vendor |
| Quick action **Add Vendor**, **View Invoices** | Unchanged from Week 1 |
| Recent Purchase Orders / Spending Trends | Still empty states |

## 6. Week 1 Screens — Deltas

- **Vendors form:** add optional **Rating** (0.0–5.0, step 0.1). Vendors table keeps six columns; rating shown in drawer. 
- **Vendor drawer:** new **Portal users** section: list linked users (name, email), **Link user** (search Vendor-role users by email), **Unlink**. Visible to Admin/Officer.
- **Sidebar:** RFQ's and Quotations active for all roles that have access; Vendor sees `Dashboard, RFQ's` *(shows their assigned list)*, `Quotations`. To avoid duplicate vendor pages, the vendor's "RFQ's" item routes to the same assigned-RFQ list as "Quotations" **(extension; confirm)**.

## 7. Copy and Formatting

- Currency `₹` with Indian grouping (`₹2,00,010`); dates `DD MMM YYYY`; times 24h with timezone label on deadline fields.
- Button labels (exact): `Save & Send to Vendors`, `Save as Draft`, `+ add line item`, `+ add vendor`, `Submit Quotation`, `Save Draft`, `Select`.
- Destructive/irreversible actions always use `ConfirmDialog` and state the consequence.
- Error tone: say what happened and what to do ("The deadline has passed, so this quotation can no longer be changed.").

## 8. Accessibility

- Comparison table: real `<table>` with `<th scope="col|row">`; lowest conveyed by text badge + color + `aria-label="Lowest price"`; sort/filter controls labeled; focus ring on all actions.
- Dropzone: button-equivalent with keyboard activation; progress announced via `aria-live="polite"`.
- Line-items editor: row add/remove announced; each input labeled by row ("Item 2 quantity").
- Stepper: ordered list, `aria-current`, not the only way to navigate.
- Countdown text is static text (not a ticking live region); refresh on focus.
- Minimum 40px targets; contrast AA on green highlight (white on `#15803D` ≥ 4.5:1).

## 9. Design QA Checklist

- [ ] Create RFQ shows stepper, two-column layout, chips for vendors, dashed attachments box, both buttons with exact labels
- [ ] Submit Quotations shows RFQ summary, quote table with 5 columns, Tax/GST %, Note/terms, totals panel, both buttons
- [ ] Comparison shows criteria rows exactly as the wireframe (+ added toolbar and button row), lowest column green with badge, footer note
- [ ] Mockup arithmetic reproduced (₹1,69,500 / ₹30,510 / ₹2,00,010)
- [ ] All states designed: loading, empty, error, read-only, deadline passed, version conflict
- [ ] Vendor role shows no staff data; Manager sees read-only controls
- [ ] Verified at 375 / 768 / 1280 widths; keyboard-only pass on all three screens
