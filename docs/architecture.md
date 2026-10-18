# VendorBridge — Architecture (Week 1)

## 1. Technology Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Fast dev loop, strong typing, component reuse |
| Styling | Tailwind CSS + small headless component set (shadcn/ui style) | Matches dark/green design with design tokens |
| Data fetching | TanStack Query + Axios | Caching, loading/error states, retry on 401 refresh |
| Forms | React Hook Form + Zod | Shared validation approach with backend |
| Routing | React Router v6 | Route guards, nested layouts |
| Backend | Node.js 20 + Express + TypeScript | Simple, well-understood REST API |
| Validation | Zod | Single source of truth for request schemas |
| ORM / DB | Prisma + PostgreSQL 16 | Relational data fits procurement; migrations; type safety |
| Auth | JWT access token + rotating refresh token (httpOnly cookies), argon2id hashing | Secure session handling without exposing tokens to JS |
| Email | Nodemailer (SMTP; Mailtrap/Ethereal in dev) | Functional password reset |
| Testing | Vitest, Supertest, React Testing Library, Playwright (smoke) | Unit, API, component, e2e |
| Tooling | ESLint, Prettier, Husky + lint-staged, Docker Compose (Postgres) | Consistency, easy setup |

> Alternative stacks are allowed by the brief; this one is chosen for clear frontend/backend/database separation.

## 2. System Overview

```mermaid
flowchart LR
  B[Browser - React SPA] -- HTTPS, cookies --> API[Express API]
  API --> MW[Middleware: helmet, cors, rate limit, auth, rbac, validate]
  MW --> C[Controllers]
  C --> S[Services]
  S --> P[Prisma Client]
  P --> DB[(PostgreSQL)]
  S --> M[SMTP mail service]
```

**Responsibilities**
- **Client:** UI, client-side validation for UX, route guards for UX, API calls. Never holds secrets or tokens in JS-accessible storage.
- **Server:** All authentication, authorization, validation, business rules, persistence.
- **Database:** System of record. Constraints (unique, FK, enums) are the last line of defense.

## 3. Repository Layout

```
VendorBridge-X-Kagnus/
├─ README.md
├─ docs/                      # prd.md, architecture.md, rules.md, design.md, tasks.md, memory.md
├─ docker-compose.yml         # postgres (+ optional mailhog)
├─ .env.example               # root reference only
├─ client/
│  ├─ .env.example
│  └─ src/
│     ├─ app/                 # router, providers, guards
│     ├─ components/
│     │  ├─ ui/               # Button, Input, Select, Badge, Modal, Drawer, Table, Card, EmptyState, Toast
│     │  └─ layout/           # AppShell, Sidebar, Topbar
│     ├─ features/
│     │  ├─ auth/             # pages, api, hooks, schemas
│     │  ├─ dashboard/
│     │  └─ vendors/
│     ├─ lib/                 # axios instance, utils, constants (roles, nav)
│     └─ pages/placeholders/  # ComingSoon pages for later weeks
└─ server/
   ├─ .env.example
   ├─ prisma/
   │  ├─ schema.prisma
   │  ├─ migrations/
   │  └─ seed.ts
   └─ src/
      ├─ config/              # env parsing (Zod), constants
      ├─ middleware/          # authenticate, authorize, validate, rateLimit, errorHandler
      ├─ modules/
      │  ├─ auth/             # routes, controller, service, schemas
      │  ├─ users/
      │  ├─ vendors/
      │  ├─ dashboard/
      │  └─ audit/            # write-only audit log service
      ├─ lib/                 # prisma client, mailer, tokens, password, logger
      ├─ app.ts
      └─ server.ts
```

## 4. Data Model

```mermaid
erDiagram
  USER ||--o{ SESSION : has
  USER ||--o{ PASSWORD_RESET_TOKEN : requests
  USER ||--o{ VENDOR : creates
  USER ||--o{ AUDIT_LOG : performs
  VENDOR ||--o{ AUDIT_LOG : subject
```

### Prisma schema (reference)

```prisma
enum Role {
  ADMIN
  PROCUREMENT_OFFICER
  MANAGER
  VENDOR
}

enum RoleStatus {
  ACTIVE
  PENDING
  BLOCKED
}

enum VendorStatus {
  ACTIVE
  PENDING
  BLOCKED
}

model User {
  id             String   @id @default(uuid())
  firstName      String
  lastName       String
  email          String   @unique
  passwordHash   String
  phone          String
  country        String
  role           Role
  additionalInfo String?
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  sessions     Session[]
  resetTokens  PasswordResetToken[]
  vendors      Vendor[]
  auditLogs    AuditLog[]
}

model Session {
  id               String   @id @default(uuid())
  userId           String
  refreshTokenHash String   @unique
  userAgent        String?
  ip               String?
  expiresAt        DateTime
  revokedAt        DateTime?
  createdAt        DateTime @default(now())
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model PasswordResetToken {
  id        String    @id @default(uuid())
  userId    String
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model Vendor {
  id           String       @id @default(uuid())
  name         String
  category     String
  gstNumber    String       @unique
  contactName  String
  contactEmail String
  contactPhone String
  address      String?
  notes        String?
  status       VendorStatus @default(PENDING)
  deletedAt    DateTime?    // soft delete
  createdById  String
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  createdBy    User         @relation(fields: [createdById], references: [id])

  @@index([status])
  @@index([category])
  @@index([name])
  @@index([deletedAt])
}

// Write-once. No update or delete code paths may exist for this table.
model AuditLog {
  id         String   @id @default(uuid())
  actorId    String?
  action     String   // e.g. AUTH_LOGIN, VENDOR_CREATED, VENDOR_UPDATED, VENDOR_DELETED
  entityType String
  entityId   String?
  metadata   Json?
  ip         String?
  createdAt  DateTime @default(now())
  actor      User?    @relation(fields: [actorId], references: [id])

  @@index([entityType, entityId])
  @@index([createdAt])
}
```

**Notes**
- `gstNumber` uniqueness applies to non-deleted vendors; on soft delete, the service renames or the unique check ignores `deletedAt IS NOT NULL` (use a partial unique index in a raw migration).
- Refresh tokens and reset tokens are stored **hashed** (SHA-256), never plaintext.
- `AuditLog` is created in Week 1 (writes only) so Week 4's Activity screen has history; the mockup requires audit logs to be immutable.

## 5. Authentication and Session Design

```mermaid
sequenceDiagram
  participant U as Browser
  participant A as API
  participant D as DB
  U->>A: POST /auth/login (email, password)
  A->>D: find user, verify argon2 hash
  A->>D: create Session (refresh hash)
  A-->>U: Set-Cookie access (15m), refresh (7d) httpOnly
  U->>A: GET /vendors (cookie)
  A->>A: verify access JWT, check role
  A-->>U: 200 data
  U->>A: GET /vendors (access expired)
  A-->>U: 401 TOKEN_EXPIRED
  U->>A: POST /auth/refresh (refresh cookie)
  A->>D: validate, rotate refresh token
  A-->>U: new cookies
```

- **Access token:** JWT (15 min) containing `sub`, `role`. Cookie: `httpOnly; Secure (prod); SameSite=Lax`.
- **Refresh token:** random 256-bit value, 7 days, rotated on every use. Reuse of a revoked token revokes all of that user's sessions.
- **CSRF:** SameSite cookies plus required custom header `X-Requested-With: VendorBridge` on mutating requests, and strict CORS origin.
- **Logout:** revoke session row, clear both cookies.
- **Password reset:** token = 32 random bytes, stored hashed, 30-minute expiry, single use. On success, revoke all sessions. Endpoint always returns the same generic response.
- **Rate limits:** login and forgot-password (e.g., 5 attempts / 15 min per IP+email).
- **Admin registration:** requires `ADMIN_INVITE_CODE` from server env; otherwise `403`.

## 6. Authorization (RBAC)

Central policy map in `server/src/config/permissions.ts`:

```ts
export const PERMISSIONS = {
  'vendor:read':   ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'],
  'vendor:create': ['ADMIN', 'PROCUREMENT_OFFICER'],
  'vendor:update': ['ADMIN', 'PROCUREMENT_OFFICER'],
  'vendor:delete': ['ADMIN'],
  'dashboard:read': ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR'],
} as const;
```

Routes use `authenticate` then `authorize('vendor:create')`. The client mirrors this map **only to hide UI**, never as the control.

## 7. REST API Contract

Base path: `/api/v1`. JSON only.

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | public | Create account |
| POST | `/auth/login` | public | Sets cookies, returns user |
| POST | `/auth/logout` | user | Revoke session |
| POST | `/auth/refresh` | refresh cookie | Rotate tokens |
| GET | `/auth/me` | user | Current user |
| POST | `/auth/forgot-password` | public | Send reset email (generic response) |
| POST | `/auth/reset-password` | public | `{ token, password }` |

### Vendors

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/vendors` | `vendor:read` | List with query params |
| GET | `/vendors/:id` | `vendor:read` | Detail |
| POST | `/vendors` | `vendor:create` | Create |
| PATCH | `/vendors/:id` | `vendor:update` | Update |
| DELETE | `/vendors/:id` | `vendor:delete` | Soft delete |

**List query params:** `search`, `status` (`ACTIVE|PENDING|BLOCKED`), `category`, `page` (default 1), `limit` (default 10, max 100), `sortBy` (`name|createdAt|status`), `order` (`asc|desc`).

**List response**
```json
{
  "data": [ { "id": "...", "name": "Infra Supplies Pvt ltd", "category": "Construction",
              "gstNumber": "27AABCS1429B1Z0", "contactPhone": "+919876543210", "status": "ACTIVE" } ],
  "meta": { "page": 1, "limit": 10, "total": 29, "totalPages": 3 },
  "counts": { "all": 29, "active": 21, "pending": 4, "blocked": 3 }
}
```
`search` matches `name`, `gstNumber`, `category` (case-insensitive `contains`). `counts` ignore the status filter but respect search so chip numbers stay meaningful.

### Dashboard

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/dashboard/summary` | `dashboard:read` | Card values, recent POs, spending trend |

```json
{
  "activeRfqs": 0, "pendingApprovals": 0,
  "posThisMonth": { "count": 0, "amount": 0 },
  "overdueInvoices": 0,
  "recentPurchaseOrders": [], "spendingTrend": []
}
```

### Health
`GET /health` returns `{ status: "ok" }` (checks DB connectivity).

### Error format (all endpoints)

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid input",
             "details": [ { "field": "gstNumber", "message": "Invalid GST format" } ] } }
```

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod failure |
| 401 | `UNAUTHENTICATED` / `TOKEN_EXPIRED` | Missing/invalid/expired session |
| 403 | `FORBIDDEN` | Role not permitted |
| 404 | `NOT_FOUND` | Missing resource |
| 409 | `CONFLICT` | Duplicate email or GST |
| 429 | `RATE_LIMITED` | Too many attempts |
| 500 | `INTERNAL_ERROR` | Unexpected; no stack trace leaked |

## 8. Frontend Architecture

### Routes

| Path | Access | Screen |
|---|---|---|
| `/login` | public (redirect if authed) | Screen 1 |
| `/register` | public | Screen 2 |
| `/forgot-password`, `/reset-password/:token` | public | Reset flow |
| `/dashboard` | all authenticated | Screen 3 |
| `/vendors` | Admin, Officer, Manager | Screen 4 |
| `/rfqs`, `/quotations`, `/approvals`, `/purchase-orders`, `/invoices`, `/reports`, `/activity` | per nav matrix | Coming-soon empty states |
| `*` | n/a | 404 page |

### Structure rules
- `AppShell` (Sidebar + Topbar + Outlet) wraps authenticated routes.
- `ProtectedRoute` checks `/auth/me` result; `RoleRoute` checks allowed roles (UX only).
- Axios interceptor: on `401 TOKEN_EXPIRED` call `/auth/refresh` once, retry, else logout and redirect.
- Server state via TanStack Query (`useVendors`, `useVendor`, mutations invalidate lists). Local UI state stays in components.
- Vendors list state (search, status, page) lives in the URL query string so refresh and sharing preserve it.

### Sidebar visibility (UX only)

| Item | Admin | Officer | Manager | Vendor |
|---|:-:|:-:|:-:|:-:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Vendors | ✅ | ✅ | ✅ (read) | ❌ |
| RFQ's | ✅ | ✅ | ✅ | ✅ |
| Quotations | ✅ | ✅ | ✅ | ✅ |
| Approvals | ✅ | ✅ | ✅ | ❌ |
| Purchase orders | ✅ | ✅ | ✅ | ✅ |
| Invoices | ✅ | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | ✅ | ❌ |
| Activity | ✅ | ✅ | ✅ | ❌ |

## 9. Environment Variables

**server/.env**
```
NODE_ENV=development
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://vendorbridge:vendorbridge@localhost:5432/vendorbridge
JWT_ACCESS_SECRET=change-me-min-32-chars
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=7
COOKIE_SECURE=false
ADMIN_INVITE_CODE=change-me
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
MAIL_FROM="VendorBridge <no-reply@vendorbridge.local>"
PASSWORD_RESET_URL_BASE=http://localhost:5173/reset-password
```

**client/.env**
```
VITE_API_BASE_URL=http://localhost:4000/api/v1
```
Only non-secret, `VITE_`-prefixed values may exist in the client.

## 10. Security Checklist
- argon2id hashing; never log passwords, tokens, or reset links in production.
- Helmet, strict CORS to `CLIENT_ORIGIN`, body size limit, JSON only.
- All input validated by Zod; ORM prevents SQL injection; React escapes output.
- Generic auth errors; constant-time comparisons for tokens.
- `.env` git-ignored; `.env.example` committed; secrets validated at boot (app fails fast if missing).
- Dependency audit (`npm audit`) before submission.

## 11. Testing Strategy

| Level | Tool | Must cover |
|---|---|---|
| Unit | Vitest | Password and token utils, Zod schemas (GST regex), permission map |
| API integration | Vitest + Supertest + test DB | Register/login/logout/refresh, reset flow, each vendor endpoint × each role (401/403/200), duplicate GST 409, filters/search, pagination |
| Component | React Testing Library | Login/register forms, vendor form validation, status badge, empty states |
| E2E smoke | Playwright | Register → login → add vendor → refresh → still present → logout |

The **role × endpoint matrix test** is the key artifact proving backend RBAC.

## 12. Local Development and Deployment

- `docker compose up -d` starts Postgres.
- `npm run db:migrate && npm run db:seed` (seed: one user per role, ~25 sample vendors across all statuses).
- Run `npm run dev` in `server/` and `client/`.
- Optional deploy: client to Vercel/Netlify, API to Render/Railway, managed Postgres. In production set `COOKIE_SECURE=true`, and serve client and API on the same site (or configure `SameSite=None; Secure` deliberately).
