# base_system Modular Architecture Upgrade

**Date:** 2026-03-20
**Status:** Approved
**Approach:** B (Modular Architecture)
**Estimated effort:** ~5-6 sessions

## Context

The base_system is InfiGroup's Next.js 16 starter template, built through 10 phases of systematic hardening. It serves as the foundation for all new projects (marketing sites, SaaS apps, e-commerce, internal tools).

This design upgrades the template with modern tooling, modular architecture, and production-grade security/observability while maintaining the single-repo-per-project model.

## Decisions

| Question      | Answer                                            | Rationale                                                                |
| ------------- | ------------------------------------------------- | ------------------------------------------------------------------------ |
| Project types | All (marketing, SaaS, e-commerce, internal tools) | Template must flex across InfiGroup's full portfolio                     |
| Monorepo      | No — single repo per project                      | Team friction; other devs unfamiliar with monorepo workflows             |
| Auth          | Supabase Auth (keep existing)                     | Already invested in Supabase ecosystem; RLS integration                  |
| Database      | Drizzle ORM on top of Supabase                    | Type-safe queries, migration files, edge-compatible, keeps RLS/realtime  |
| API layer     | REST routes + Server Actions                      | tRPC unnecessary for single-repo; Server Actions for component mutations |
| Linting       | Biome (replaces ESLint + Prettier)                | Next.js default since 15.5, 10-25x faster, single config                 |
| Security      | Arcjet + nonce-based CSP                          | Replaces in-memory rate limiter; production-grade WAF + bot detection    |
| Observability | Sentry                                            | Errors + performance traces + structured logs                            |
| Env vars      | @t3-oss/env-nextjs                                | Build-time validation, server/client separation                          |
| Performance   | React Compiler + PPR                              | Both available in Next.js 16, zero-code-change                           |
| CI/CD         | GitHub Actions + Husky hooks                      | Husky installed but not configured; need CI pipeline                     |

## Section 1: Module Structure & Boundaries

### Directory Layout

```
src/lib/
  core/                        <- REQUIRED in every project
    env.ts                     <- @t3-oss/env-nextjs (server/client separation)
    utils.ts                   <- cn() utility for class merging
    config/
      site.ts                  <- siteConfig (name, url, locales, etc.)
    security/
      arcjet.ts                <- Arcjet client + rule definitions (graceful degradation if ARCJET_KEY missing)
      csrf.ts                  <- existing origin validation
      sanitize.ts              <- existing escapeHtml, stripHtml, etc.
      csp.ts                   <- nonce generation for CSP headers
      index.ts
    api/
      response.ts              <- ApiResponse<T>, successResponse, errorResponse
      errors.ts                <- AppError, ValidationError, NotFoundError, etc.
      with-api.ts              <- route handler wrapper (validation + arcjet + error handling)
      index.ts
    index.ts

  auth/                        <- OPT-IN: delete folder + remove from middleware
    clients/
      browser.ts               <- Supabase browser auth client
      server.ts                <- Supabase server auth client
      middleware.ts             <- Supabase middleware client (session refresh)
    guard.ts                   <- middleware auth guard (protect routes)
    hooks.ts                   <- useUser(), useSession() client hooks
    types.ts                   <- User, Session types
    index.ts

  database/                    <- OPT-IN: delete folder if project is purely static
    client.ts                  <- Drizzle client + Supabase Postgres connection
    schema/                    <- Drizzle table definitions (one file per table)
      index.ts
    migrations/                <- auto-generated SQL files (version-controlled)
    repository.ts              <- BaseRepository refactored to use Drizzle
    index.ts

  email/                       <- OPT-IN: delete folder if no email needed
    client.ts                  <- Resend singleton
    service.ts                 <- sendContactEmails, etc.
    templates/
      contact-admin.tsx
      contact-confirmation.tsx
    index.ts

  monitoring/                  <- OPT-IN: delete folder for simple projects
    sentry.ts                  <- Sentry init, config, error boundary helpers
    analytics.ts               <- Vercel Analytics + SpeedInsights wrappers
    index.ts

  validators/                  <- shared Zod schemas, standalone (no core dependency)
    contact.schema.ts
    index.ts

drizzle.config.ts              <- Drizzle Kit config at project root (Drizzle Kit default)
```

### Module Rules

1. `core/` is the only required module — always present in every project.
2. Every other module is opt-in — delete the folder and its env vars to remove it.
3. Modules never import from each other's internals (e.g., `email/` imports from `core/` but never from `auth/`).
4. Each module's `index.ts` is the public API — all imports go through it.
5. Env vars for optional modules use `@t3-oss/env-nextjs` optional fields — missing vars don't crash the app, they disable the module.
6. `validators/` is standalone — it has no dependency on `core/` or any other module. Zod schemas are pure data definitions. The `with-api.ts` wrapper accepts schemas as parameters (dependency injection), so `core/` does not import from `validators/`.

### Dependency Graph

```
validators (standalone, no dependencies)
core (required, no dependencies on optional modules)
  <- auth (optional, depends on core)
  <- database (optional, depends on core)
  <- email (optional, depends on core)
  <- monitoring (optional, depends on core)
```

No circular dependencies. No optional module depends on another optional module. `with-api.ts` in `core/` accepts Zod schemas via function parameters, not imports.

### Middleware Composition

The root `middleware.ts` composes functionality from multiple modules:

```typescript
// middleware.ts (project root)
import { generateCspNonce } from '@/lib/core/security/csp';

// Conditional imports — only if auth/ module exists
// When auth/ is deleted, remove these imports and the auth guard call
import { refreshSession } from '@/lib/auth/clients/middleware';
import { authGuard } from '@/lib/auth/guard';

export async function middleware(request: NextRequest) {
  // 1. i18n routing (always — from next-intl)
  // 2. CSP nonce generation (always — from core)
  // 3. Session refresh (only if auth/ module present)
  // 4. Auth guard (only if auth/ module present)
}
```

**Execution order:** i18n -> CSP nonce -> session refresh -> auth guard

**When auth/ is deleted:** Remove the auth imports and steps 3-4. The middleware still handles i18n and CSP. No runtime errors — it's a compile-time removal.

## Section 2: Security Hardening

### Arcjet (replaces in-memory rate limiter)

The current `rate-limit.ts` uses an in-memory Map. This resets on every serverless cold start and doesn't share state across instances. Arcjet replaces it with:

- **Shield WAF** — OWASP Top 10 protection (SQLi, XSS, path traversal)
- **Rate limiting** — sliding window, persisted across instances
- **Bot detection** — block scrapers, allow search engines
- **Email validation** — disposable/invalid email detection for forms

Applied via the `with-api.ts` route wrapper so every API route gets protection by default.

### Arcjet Graceful Degradation

Arcjet lives in `core/` but degrades gracefully when `ARCJET_KEY` is missing:

- `arcjet.ts` checks for `ARCJET_KEY` at initialization
- If absent: all Arcjet calls return "allow" (no-op). A console warning is logged once at startup: `"ARCJET_KEY not set — security protections disabled (rate limiting, WAF, bot detection)"`
- If present: full protection is active
- **Security implication:** Running without Arcjet means no rate limiting or WAF. This is acceptable for local development and static marketing sites. Production apps with API endpoints should always set `ARCJET_KEY`.

### Nonce-based CSP

Current CSP uses domain allowlists. The upgrade:

1. `middleware.ts` generates a cryptographic nonce per request via `core/security/csp.ts`
2. Nonce passed via request header to the root layout
3. Root layout reads nonce from headers, passes to `<Script>` tags
4. CSP header: `script-src 'nonce-<value>' 'strict-dynamic'`

Only scripts with the correct nonce execute, regardless of domain.

### What stays

- `csrf.ts` — origin validation remains solid
- `sanitize.ts` — HTML escaping still needed for non-React contexts
- Security headers in `next.config.ts` (HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy)

### What gets deleted

- `rate-limit.ts` — replaced entirely by Arcjet

## Section 3: API Layer & Error Handling

### `with-api.ts` Route Wrapper

Eliminates boilerplate repetition in every API route.

#### Options Interface

```typescript
interface WithApiOptions<TSchema extends z.ZodType> {
  schema?: TSchema; // Zod schema for request body validation
  rateLimit?: keyof typeof rateLimitPresets; // named preset (see below)
  csrf?: boolean; // enable origin validation (default: true for POST/PUT/DELETE)
  auth?: boolean; // require authenticated session (default: false)
}

// Rate limit presets defined in core/security/arcjet.ts
const rateLimitPresets = {
  contact: { max: 5, window: '1m' },
  api: { max: 60, window: '1m' },
  auth: { max: 10, window: '5m' },
  strict: { max: 3, window: '1m' },
} as const;

// Handler context
interface ApiContext<T> {
  data: T; // validated request body (typed from schema)
  request: NextRequest; // original request
  user?: User; // populated when auth: true
}
```

#### Usage Example

```typescript
// Before (repeated in every route)
export async function POST(request: Request) {
  if (!validateCsrfOrigin(request)) return error(403);
  const limited = await contactFormLimiter.check(ip);
  if (!limited.allowed) return error(429);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return error(422);
  try {
    /* business logic */
  } catch (e) {
    /* error handling */
  }
}

// After
export const POST = withApi(
  {
    schema: contactSchema,
    rateLimit: 'contact',
    csrf: true,
  },
  async ({ data, request }) => {
    await sendContactEmails(data);
    return successResponse({ message: 'Sent' });
  },
);
```

### Typed Error Classes (`core/api/errors.ts`)

- `AppError` — base class with status code + user-safe message
- `ValidationError` (422)
- `NotFoundError` (404)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `RateLimitError` (429)

The wrapper catches these and returns proper `ApiResponse<T>` automatically. Unknown errors log to Sentry (if configured) and return generic 500.

### Server Actions

For simple form mutations tightly coupled to a component (newsletter signup, settings update).

**Security model for Server Actions:**

- **CSRF:** Next.js provides built-in CSRF protection for Server Actions (non-guessable action IDs, Origin header checking). No additional CSRF handling needed.
- **Rate limiting:** For sensitive actions (auth, payment), import and call Arcjet directly within the action. For low-risk actions (settings updates), rely on auth alone.
- **Validation:** Use Zod schema validation directly at the top of the action.
- **Error format:** Server Actions return `{ success: boolean, data?: T, error?: string }` — same shape as `ApiResponse<T>` for consistency, but returned as plain objects (not NextResponse).

## Section 4: Database (Drizzle ORM)

### Setup

- Drizzle connects to Supabase's PostgreSQL via connection string (from env vars)
- Schema defined in TypeScript — types inferred, no `db:types` script needed
- `BaseRepository` keeps the same public API (`findAll`, `findById`, `create`, `update`, `delete`) but uses Drizzle queries internally
- `drizzle.config.ts` lives at the project root (Drizzle Kit default location)

### Migration Workflow

1. Define/modify schema in `src/lib/database/schema/`
2. Run `npx drizzle-kit generate` — creates SQL migration file in `src/lib/database/migrations/`
3. Review migration in PR
4. Run `npx drizzle-kit migrate` — applies to database

### Coexistence with Supabase Client

Drizzle handles queries. Supabase client remains available for:

- Real-time subscriptions
- Storage buckets
- Auth (handled by `auth/` module)

### New Environment Variables

```
DATABASE_URL               <- Supabase Postgres connection string (pooler)
DATABASE_URL_DIRECT        <- Direct connection for migrations
```

## Section 5: Tooling & DX

### Biome (replaces ESLint + Prettier)

- Single `biome.json` config at root
- Delete: `eslint.config.mjs`, `.prettierrc`, `.prettierignore`
- Remove packages: `eslint`, `eslint-config-next`, `prettier`
- Add package: `@biomejs/biome`
- Update `lint-staged`: `biome check --write --staged`
- VS Code: swap ESLint + Prettier extensions for Biome extension

### @t3-oss/env-nextjs (replaces custom env.ts)

- Separates `server` and `client` env vars at schema level
- Build fails if server vars are accidentally imported in client code
- Optional vars for opt-in modules (missing = module disabled, no crash)

### React Compiler

- Enable via `reactCompiler: true` in `next.config.ts` experimental options (Next.js 16 built-in support, no Babel plugin needed — preserves SWC)
- Automatically memoizes all components
- Remove manual `useMemo`/`useCallback` calls

### Partial Prerendering (PPR)

- Enable via `ppr` in `next.config.ts` (verify exact config key at implementation time — may be `experimental.ppr` or top-level depending on Next.js 16 stable status)
- Static shells render at build time, dynamic content streams in
- Works with existing `<Suspense>` boundaries

### CI/CD

**GitHub Actions:**

- `.github/workflows/ci.yml` — on PR: biome check -> type-check -> vitest -> build
- `.github/workflows/e2e.yml` — on PR to main: playwright tests after build

**Husky Hooks:**

- `.husky/pre-commit` — `biome check --staged`
- `.husky/pre-push` — `tsc --noEmit && vitest run`

## Section 6: Monitoring (Sentry)

### File Structure

```
src/lib/monitoring/
  sentry.ts              <- init config, DSN from env
  analytics.ts           <- Vercel Analytics + SpeedInsights (moved here)
  index.ts

Project root (Sentry SDK requirement):
  sentry.client.config.ts
  sentry.server.config.ts
  sentry.edge.config.ts
  instrumentation.ts     <- server-side initialization
```

### Capabilities

- Error tracking with source maps (uploaded on build)
- Performance traces (Web Vitals, server-side spans)
- Structured logging: `Sentry.logger.info()` / `.error()` replaces `console.log`
- Error boundary in `global-error.tsx` reports to Sentry automatically

### Graceful Degradation

If `SENTRY_DSN` env var is missing, the monitoring module is inert — no errors thrown, just no tracking. Projects that don't need monitoring simply omit the env var.

## Implementation Phases

Each phase is a self-contained PR that leaves the app in a working state.

### Phase 1: Core Module + Env Rewrite (~1 session)

1. Create `src/lib/core/` directory structure
2. Move `env.ts`, `utils.ts`, `config/site.ts` into `core/`
3. Rewrite `env.ts` with `@t3-oss/env-nextjs`
4. Move `csrf.ts`, `sanitize.ts` into `core/security/`
5. Move `ApiResponse` types into `core/api/response.ts`
6. Create `core/api/errors.ts` (typed error classes)
7. Update all import paths across the project
8. Move existing tests to new locations, verify they pass
9. **Checkpoint:** `npm run build && npm run test` — must pass

### Phase 2: Security — Arcjet + CSP (~1 session)

1. Install `@arcjet/next`
2. Create `core/security/arcjet.ts` with graceful degradation
3. Create `core/security/csp.ts` (nonce generation)
4. Create `core/api/with-api.ts` wrapper
5. Refactor `api/contact/route.ts` to use `withApi`
6. Update `middleware.ts` for nonce-based CSP
7. Delete `rate-limit.ts` and its test
8. Write tests for `with-api.ts`, `arcjet.ts` (mocked), `errors.ts`
9. Update CSP header in `next.config.ts`
10. **Checkpoint:** `npm run build && npm run test` — must pass

### Phase 3: Auth + Database Modules (~1 session)

1. Create `src/lib/auth/` — move Supabase clients, add guard + hooks + types
2. Create `src/lib/auth/index.ts` barrel export
3. Install `drizzle-orm`, `drizzle-kit`, `postgres`
4. Create `src/lib/database/` — client, schema, repository (refactored from Supabase)
5. Create `drizzle.config.ts` at project root
6. Add `DATABASE_URL` and `DATABASE_URL_DIRECT` to env schema as optional
7. Update middleware composition (auth imports)
8. Update all import paths
9. **Checkpoint:** `npm run build && npm run test` — must pass

### Phase 4: Email + Monitoring Modules (~1 session)

1. Create `src/lib/email/` — move Resend client, service, templates
2. Create `src/lib/email/index.ts` barrel export
3. Install `@sentry/nextjs`
4. Create `src/lib/monitoring/` — sentry.ts, analytics.ts
5. Create Sentry config files at project root
6. Create `instrumentation.ts`
7. Update `global-error.tsx` to report to Sentry
8. Move Vercel Analytics/SpeedInsights setup into `monitoring/analytics.ts`
9. Update MSW handlers for new module paths
10. **Checkpoint:** `npm run build && npm run test` — must pass

### Phase 5: Tooling Migration (~1 session)

1. Install `@biomejs/biome`, create `biome.json`
2. Remove `eslint`, `eslint-config-next`, `prettier` and their configs
3. Run `biome check --write` to auto-format entire codebase
4. Update `lint-staged` config
5. Enable React Compiler in `next.config.ts`
6. Enable PPR in `next.config.ts` (verify config key)
7. Remove any manual `useMemo`/`useCallback` calls
8. Update VS Code workspace settings (`.vscode/settings.json`)
9. **Checkpoint:** `npm run build && npm run test` — must pass

### Phase 6: CI/CD + Cleanup (~1 session)

1. Create `.github/workflows/ci.yml`
2. Create `.github/workflows/e2e.yml`
3. Wire `.husky/pre-commit` and `.husky/pre-push` hooks
4. Update `CONVENTIONS.md` to reflect new module structure
5. Update `.env.example` with all new env vars
6. Delete empty `src/types/` and `src/config/` directories
7. Delete `src/lib/supabase/` directory (fully migrated to auth/ + database/)
8. Delete `src/lib/resend/` directory (fully migrated to email/)
9. Final full test run + coverage check
10. **Checkpoint:** `npm run build && npm run test && npm run test:e2e` — must all pass

## Rollback Strategy

### Branch Strategy

- Create a long-lived feature branch: `feat/modular-architecture`
- Each phase is a commit (or small group of commits) on this branch
- After each phase checkpoint passes, the branch is in a deployable state
- Only merge to `main` after all 6 phases pass

### Per-Phase Recovery

- If a phase breaks the build, revert to the previous phase's commit on the feature branch
- Each phase is designed to be independently revertable without affecting other phases
- Exception: Phase 1 (core restructure) is the foundation — if it breaks, fix forward rather than revert

### Escape Hatch

- If the upgrade proves too disruptive mid-way, the feature branch can be abandoned
- `main` remains untouched throughout the process
- Partial adoption is possible: merge only completed phases (e.g., just Phases 1-2 for the restructure + security upgrade)

## Files Deleted

| File                                   | Reason                   |
| -------------------------------------- | ------------------------ |
| `src/lib/rate-limit.ts`                | Replaced by Arcjet       |
| `src/lib/__tests__/rate-limit.test.ts` | Replaced by Arcjet tests |
| `eslint.config.mjs`                    | Replaced by Biome        |
| `.prettierrc`                          | Replaced by Biome        |
| `.prettierignore`                      | Replaced by Biome        |

## Files Moved

| From                             | To                                   | Reason                                                  |
| -------------------------------- | ------------------------------------ | ------------------------------------------------------- |
| `src/lib/csrf.ts`                | `src/lib/core/security/csrf.ts`      | Module organization                                     |
| `src/lib/sanitize.ts`            | `src/lib/core/security/sanitize.ts`  | Module organization                                     |
| `src/lib/env.ts`                 | `src/lib/core/env.ts`                | Module organization (rewritten with @t3-oss/env-nextjs) |
| `src/lib/utils.ts`               | `src/lib/core/utils.ts`              | Module organization                                     |
| `src/types/api.ts`               | `src/lib/core/api/response.ts`       | Module organization                                     |
| `src/config/site.ts`             | `src/lib/core/config/site.ts`        | Module organization                                     |
| `src/lib/supabase/client.ts`     | `src/lib/auth/clients/browser.ts`    | Auth module                                             |
| `src/lib/supabase/server.ts`     | `src/lib/auth/clients/server.ts`     | Auth module                                             |
| `src/lib/supabase/middleware.ts` | `src/lib/auth/clients/middleware.ts` | Auth module                                             |
| `src/lib/supabase/repository.ts` | `src/lib/database/repository.ts`     | Database module                                         |
| `src/lib/resend/*`               | `src/lib/email/*`                    | Email module                                            |
| `src/lib/validators/*`           | `src/lib/validators/*`               | No change (stays at same level)                         |

## New Dependencies

| Package              | Purpose                                   | Type          |
| -------------------- | ----------------------------------------- | ------------- |
| `@biomejs/biome`     | Linting + formatting                      | devDependency |
| `@t3-oss/env-nextjs` | Env var validation                        | dependency    |
| `@arcjet/next`       | Security (rate limit, WAF, bot detection) | dependency    |
| `drizzle-orm`        | Type-safe database queries                | dependency    |
| `drizzle-kit`        | Migration generation + management         | devDependency |
| `postgres`           | PostgreSQL driver for Drizzle             | dependency    |
| `@sentry/nextjs`     | Error tracking + observability            | dependency    |

## Removed Dependencies

| Package              | Reason            |
| -------------------- | ----------------- |
| `eslint`             | Replaced by Biome |
| `eslint-config-next` | Replaced by Biome |
| `prettier`           | Replaced by Biome |

## Environment Variables (Complete)

### Required (core)

```
NEXT_PUBLIC_SITE_URL          # App URL
NEXT_PUBLIC_SITE_NAME         # App name
NODE_ENV                      # development / production / test
```

### Optional (per module)

```
# Auth module
NEXT_PUBLIC_SUPABASE_URL      # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY # Supabase public key
SUPABASE_SERVICE_ROLE_KEY     # Supabase admin key (server-only)

# Database module
DATABASE_URL                  # Supabase Postgres connection (pooler)
DATABASE_URL_DIRECT           # Direct connection for migrations

# Email module
RESEND_API_KEY                # Resend API key
RESEND_FROM_EMAIL             # Verified sender email
RESEND_ADMIN_EMAIL            # Admin notification recipient

# Security (Arcjet) — in core, but degrades gracefully if missing
ARCJET_KEY                    # Arcjet API key (without it: no rate limiting, WAF, or bot detection)

# Monitoring (Sentry)
SENTRY_DSN                    # Sentry project DSN
SENTRY_AUTH_TOKEN             # For source map uploads (CI only)

# Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID  # Vercel Analytics (auto-set on Vercel)
```

## Testing Strategy

### Existing Tests (moved to new locations)

- `csrf.test.ts` -> `src/lib/core/security/__tests__/csrf.test.ts`
- `sanitize.test.ts` -> `src/lib/core/security/__tests__/sanitize.test.ts`
- `contact-schema.test.ts` -> `src/lib/validators/__tests__/contact-schema.test.ts`
- `utils.test.ts` -> `src/lib/core/__tests__/utils.test.ts`

### New Tests

- `with-api.test.ts` — unit tests for the route wrapper (mock Arcjet, test validation/error handling/CSRF/auth flows)
- `errors.test.ts` — unit tests for error class instantiation and status codes
- `arcjet.test.ts` — unit tests with mocked Arcjet SDK (test graceful degradation when key is missing)
- `repository.test.ts` — integration tests with test database (Drizzle queries against real PostgreSQL, not mocks)

### Test Infrastructure

- Arcjet: mock the SDK in unit tests (`vi.mock('@arcjet/next')`)
- Drizzle repository: use a test database (Supabase branch or local PostgreSQL). Tests run migrations, seed data, and clean up.
- MSW handlers updated for new module import paths
- E2E tests remain in `src/test/e2e/` — no changes needed
- Coverage threshold stays at 80%

## Migration Impact on Existing Projects

Projects ported from base_system (ShipX, Fyn, Arka) are **not required** to adopt these changes. They can continue on the current structure. If they choose to upgrade:

1. Import paths change (`@/lib/supabase/client` -> `@/lib/auth`) — find-and-replace
2. New dependencies need to be installed
3. Biome config replaces ESLint + Prettier configs
4. Env vars may need additions (Arcjet key, Sentry DSN, database URLs)

Each upgrade is independent — projects can adopt module-by-module.
