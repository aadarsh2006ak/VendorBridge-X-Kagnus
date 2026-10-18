# VendorBridge — Engineering Rules

These rules apply to every contributor and AI coding assistant working in `VendorBridge-X-Kagnus`. Read `prd.md`, `architecture.md`, `design.md`, and `memory.md` before starting work.

## 1. Golden Rules

1. **One repository, all four weeks.** Never create a new repo per week. Each week builds on the last.
2. **Backend is the authority.** Authentication, authorization, and validation are enforced on the server. Frontend checks exist only for UX.
3. **Follow the design.** Use the Excalidraw mockup for layout, fields, navigation, and hierarchy. Do not redesign or remove specified features without approval. Log any deviation in `prd.md` §9 and `memory.md`.
4. **No fake features.** Static UI must never be presented as implemented. Unbuilt modules show honest empty / "coming soon" states.
5. **Persist everything real.** No in-memory arrays, no `localStorage` as a data store. Vendor data lives in PostgreSQL.
6. **Never expose secrets.** No credentials in the frontend, in logs, in commits, or in screenshots.
7. **Document honestly.** Incomplete work and known limitations go in the README and completion report.
8. **Stay in scope.** Week 1 = Screens 1–4 only. Do not start RFQ, quotation, approval, PO, invoice, report, or activity features.

## 2. Security Rules

- Every non-public route has `authenticate`; every restricted route also has `authorize(permission)`.
- Permissions come from the single map in `server/src/config/permissions.ts`. No inline role string comparisons in controllers.
- Hash passwords with argon2id (or bcrypt cost ≥ 12). Hash refresh and reset tokens (SHA-256) before storing.
- Auth cookies: `httpOnly`, `Secure` in production, `SameSite=Lax`. Never put tokens in `localStorage`, URLs (except the one-time reset token), or response bodies.
- Auth errors are generic: "Invalid email or password". Forgot-password always returns the same response.
- Rate-limit login, register, and forgot-password.
- Public registration cannot create an Admin without the server-side invite code.
- Validate **all** request bodies, params, and queries with Zod before use. Reject unknown fields (`.strict()`).
- Use Prisma query APIs only. No string-concatenated SQL. If raw SQL is unavoidable, use parameterized `$queryRaw`.
- Do not log passwords, tokens, cookies, or reset links. Do not leak stack traces to clients.
- `.env` is git-ignored. Commit `.env.example` with placeholder values only.
- The `AuditLog` table is **write-once**: no update or delete code paths, ever.

## 3. Backend Rules

- Layering: `routes → controller → service → prisma`. Controllers parse/respond only; business logic lives in services; only services touch Prisma.
- All errors flow through one `errorHandler` and the standard shape `{ error: { code, message, details? } }`. Throw typed `AppError` subclasses.
- Use correct status codes: 400, 401, 403, 404, 409, 429, 500 (see architecture §7).
- Return only whitelisted fields. Never return `passwordHash`, token hashes, or internal columns.
- Soft delete vendors (`deletedAt`). Every vendor query excludes soft-deleted rows by default.
- List endpoints are paginated with a max `limit` of 100.
- Environment is parsed and validated at boot; fail fast on missing config.
- Write an audit log entry for: login, logout, register, password reset, vendor create/update/delete.
- Database changes go through Prisma migrations only. Never edit an applied migration.

## 4. Frontend Rules

- TypeScript strict mode. No `any` without a justifying comment.
- Build UI from shared components in `components/ui`. No one-off styled buttons or inputs.
- Style only with design tokens from `design.md` (Tailwind theme). No hardcoded hex values in components.
- Server data via TanStack Query. Do not duplicate server data in global state.
- Every data view handles four states: **loading, empty, error, success**.
- Forms use React Hook Form + Zod. Show field-level errors inline and map API `details` back onto fields.
- API errors surface as toasts or inline messages. Never swallow errors silently or use `alert()`.
- Route guards and hidden buttons are UX; always assume the API will reject unauthorized calls and handle `401`/`403` gracefully.
- Accessibility: labels on all inputs, visible focus rings, `aria-*` on modals/drawers, keyboard-operable table actions, never color-only status (badge includes text).
- Keep components small (< ~200 lines). Extract hooks for data logic.
- Only `VITE_`-prefixed, non-secret variables in the client.

## 5. Code Style and Naming

| Thing | Convention |
|---|---|
| Files (components) | `PascalCase.tsx` |
| Files (other) | `kebab-case.ts` |
| Variables / functions | `camelCase` |
| Types / interfaces | `PascalCase` |
| Constants / env keys | `UPPER_SNAKE_CASE` |
| DB tables / columns | Prisma `PascalCase` models, `camelCase` fields |
| REST paths | plural nouns, kebab-case, versioned `/api/v1` |

- ESLint + Prettier must pass before commit (Husky + lint-staged).
- No dead code, no commented-out blocks, no stray `console.log`.
- Prefer small pure functions; add comments only for *why*, not *what*.

## 6. Git Workflow

- Branches: `main` (always working), `feat/<area>-<short-desc>`, `fix/<short-desc>`.
- Conventional commits: `feat(vendors): add GST validation`, `fix(auth): rotate refresh token on use`, `docs: update README`, `test: add role matrix`.
- Small, focused commits; one logical change each. Open a PR (or self-review checklist) before merging to `main`.
- Never commit: `.env`, `node_modules`, build output, real credentials, personal data.
- Tag the Week 1 submission `week-1`.

## 7. Testing Rules

- Every API endpoint has tests for: success, validation failure, unauthenticated (401), and wrong role (403) where applicable.
- Maintain the **role × vendor-endpoint matrix test** (Admin, Officer, Manager, Vendor, anonymous).
- Add a test for every bug fix.
- Tests must be deterministic and use a separate test database; never run against dev data.
- Before marking any task done, run lint, type-check, and tests.

## 8. Definition of Done (per task)

- [ ] Works end to end (UI → API → DB) and survives a page refresh
- [ ] Validation and error handling in place on both sides
- [ ] Role restrictions enforced on the backend and tested
- [ ] Loading, empty, and error states handled
- [ ] Lint, types, and tests pass
- [ ] No secrets or debug code committed
- [ ] README / docs updated if setup or behavior changed
- [ ] `tasks.md` checkbox ticked and `memory.md` updated

## 9. Instructions for AI Coding Assistants

1. Read all six docs at the start of every session. `memory.md` is the running state.
2. Work on **one task at a time** from `tasks.md`, in order, unless told otherwise.
3. Do not invent requirements. If something is ambiguous, check the docs, then ask, then record the decision in `memory.md`.
4. Do not expand scope into Weeks 2–4.
5. Do not add libraries outside the approved stack without noting the reason in `memory.md`.
6. After each task: update `tasks.md` status and append decisions/changes to `memory.md`.
7. Never claim something works without running it. Report test results truthfully, including failures.
8. Never weaken security (disable CORS, skip auth, relax validation) to make something pass.
