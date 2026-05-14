# CLAUDE.md — Base System

This file is loaded into every Claude Code conversation. It defines the non-negotiable rules for working in any project cloned from base_system.

## Project Identity

- **Template:** InfiGroup base_system — industry-grade Next.js starter
- **Stack:** Next.js 16 (App Router), TypeScript (strict), Tailwind CSS, shadcn/ui, Biome
- **Modules:** core (required) + auth, database, email, monitoring (opt-in)
- **i18n:** next-intl (default locales: en, jp)

## Architecture Rules

These are non-negotiable. Every project built from this base must follow them.

### Module System

The codebase is organized into self-contained modules under `src/lib/`:

| Module | Status | Purpose |
|--------|--------|---------|
| `core/` | Required | Env validation, security (Arcjet, CSRF, CSP), API utilities, config |
| `auth/` | Opt-in | Supabase Auth clients, auth guard, hooks |
| `database/` | Opt-in | Drizzle ORM client, schema, BaseRepository |
| `email/` | Opt-in | Resend client, service, React Email templates |
| `monitoring/` | Opt-in | Sentry error tracking, Vercel Analytics/SpeedInsights |
| `validators/` | Standalone | Shared Zod schemas (no dependencies on other modules) |

**Rules:**

- `core/` is always present — everything else is opt-in
- Delete an opt-in module's folder to remove it — no config changes needed
- Import through barrel `index.ts` files only (e.g., `import { withApi } from '@/lib/core'`)
- Modules never import from each other's internals
- Missing env vars for optional modules disable them gracefully (no crashes)

### Hard Rules

1. **Never import `process.env` directly** — always use `import { env } from '@/lib/core/env'`
2. **Never initialize SDK clients at module scope** — use lazy factory functions so builds succeed without env vars:
   ```ts
   // WRONG — crashes at build time if env var is missing
   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

   // CORRECT — only runs at request time
   function getStripe() {
     const key = process.env.STRIPE_SECRET_KEY;
     if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
     return new Stripe(key);
   }
   ```
3. **Never string-interpolate HTML** — use React Email for email templates (XSS-safe by default)
4. **All API routes must use the `withApi` wrapper** from `@/lib/core/api/with-api`
5. **All user input must be validated with Zod** at API boundaries
6. **Immutability** — create new objects, never mutate existing ones

## Key Patterns

### API Route Pattern

```typescript
import { withApi } from '@/lib/core/api/with-api';
import { successResponse } from '@/lib/core/api/response';
import { mySchema } from '@/lib/validators/my-schema';

export const POST = withApi(
  { schema: mySchema, rateLimit: 'api', csrf: true },
  async ({ data }) => {
    // Business logic only — validation, rate limiting, CSRF, error handling are automatic
    return successResponse(result);
  },
);
```

The `withApi` pipeline runs in order: CSRF check -> Rate limiting -> Auth check -> Zod validation -> Handler -> Error catch.

### Error Handling

Throw typed errors from `@/lib/core/api/errors`:

- `AppError(message, statusCode)` — generic
- `ValidationError` — 422
- `NotFoundError` — 404
- `UnauthorizedError` — 401
- `ForbiddenError` — 403
- `RateLimitError` — 429

These are caught by `withApi` and returned as `{ success: false, data: null, error: message }`.

### API Response Envelope

All API responses use the same shape:

```typescript
{ success: boolean, data: T | null, error: string | null, meta?: PaginationMeta }
```

Use `successResponse(data)` and `errorResponse(message)` from `@/lib/core/api/response`.

### Repository Pattern

Extend `BaseRepository` from `@/lib/database/repository` for data access. It provides `findAll()`, `create()`, and `delete()` out of the box. Add custom queries as methods on your subclass.

### Feature Organization

New features go under `src/features/<feature-name>/`:

```
src/features/payments/
  components/     Page-level components
  sections/       Section-level components
  validators/     Feature-specific Zod schemas (if not shared)
```

## Build-Safe Environment

Understanding this prevents failed Vercel deployments.

### Defaults

Only two env vars have defaults — everything else is optional:

| Variable | Default |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_SITE_NAME` | `My App` |

### Minimum for a successful build

A fresh clone builds with **zero env vars** because all module-specific vars are optional. The modules degrade gracefully when their vars are missing.

However, for a **functional deployment** on Vercel, set these before the first deploy:

| Scope | Variables | When Needed |
|-------|-----------|-------------|
| Always | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME` | Every project (override defaults) |
| Auth | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | If using auth module |
| Database | `DATABASE_URL`, `DATABASE_URL_DIRECT` | If using database module |
| Email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_ADMIN_EMAIL` | If using email module |
| Security | `ARCJET_KEY` | If using Arcjet rate limiting |
| Monitoring | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | If using Sentry |

### Build escape hatch

Set `SKIP_ENV_VALIDATION=1` to bypass env validation entirely during CI/build. Use this only when the build pipeline doesn't have access to runtime secrets.

### Common build failures

- **SDK client initialized at module scope** — move to a lazy factory function
- **Missing env var with `.min(1)` (non-optional)** — make it `.optional()` in `src/lib/core/env.ts` or set the var
- **Curly/smart quotes in `messages/*.json`** — replace with straight ASCII quotes (common when copy-pasting from rich text editors)

## Conventions

Follow `CONVENTIONS.md` for:

- File and code naming (PascalCase components, kebab-case utilities, camelCase functions)
- Import order (Node builtins -> External -> @/lib/ -> @/ -> Relative)
- Component rules (one per file, <200 lines, no `any`, props interface above component)
- CSS/Tailwind (design tokens, `cn()` for class merging, no inline styles)
- Testing (tests in `__tests__/` next to source, E2E in `src/test/e2e/`, 80% coverage minimum)

## Security

Follow `SECURITY.md` for:

- OWASP Top 10 coverage and implementation details
- Security headers (CSP, HSTS, X-Frame-Options)
- Pre-commit security checklist
- Rate limiting configuration
- Incident response procedure

## Pre-Commit Verification

Always run before committing:

```bash
npm run build    # must pass with zero errors
npm run lint     # must pass with zero warnings/errors
```

## Documentation Reference

| Document | Purpose |
|----------|---------|
| `CONVENTIONS.md` | Naming, structure, coding rules |
| `SECURITY.md` | Security posture, OWASP, incident response |
| `docs/DEVELOPER.md` | Architecture walkthrough, module deep dives, how-to guides |
| `docs/ENV.md` | All environment variables with descriptions |
| `docs/CONTRIBUTING.md` | Setup, scripts, PR checklist |
| `docs/RUNBOOK.md` | Deployment, health checks, troubleshooting |
| `docs/PROJECT-REQUIREMENTS.md` | Pre-development asset/content checklist |

---

## Built-in Features

These are included in every project cloned from base_system. Do not re-implement them.

### Maintenance Mode

Redirect all traffic to a "Coming Soon" page with a single env var — no code change needed.

**Files:**
- `src/app/maintenance/page.tsx` — static holding page (reads `NEXT_PUBLIC_SITE_NAME`)
- `src/app/maintenance/layout.tsx` — standalone `<html>/<body>` + CSS (required — see Layout Gotcha below)
- `middleware.ts` — maintenance check runs first, before intl/CSP/dev-panel logic

**To enable:** Set `MAINTENANCE_MODE=true` in Vercel env vars → redeploy (~1 min).
**To disable:** Remove or set `MAINTENANCE_MODE=false` → redeploy.

**Why `rewrite` not `redirect`:** A redirect to `/maintenance` is re-prefixed by `intlMiddleware` to `/en/maintenance`, which re-triggers the maintenance check → infinite redirect loop. `rewrite` serves the page in-place with no browser round-trip.

**Customize:** Edit `src/app/maintenance/page.tsx` — uses Tailwind + CSS vars (`--background`, `--foreground`) so it inherits the project theme automatically.

### Layout Architecture Gotcha

`src/app/layout.tsx` is a **passthrough** — it only returns `children`. All real layout work (`<html>`, `<body>`, fonts, `globals.css`, providers) lives in `src/app/[locale]/layout.tsx`.

**Consequence:** Any page added **outside** `[locale]/` must have its own `layout.tsx` that provides `<html>/<body>` and imports `globals.css`. Without it, Tailwind CSS will not apply.

```
src/app/
  layout.tsx              ← passthrough only (return children)
  [locale]/
    layout.tsx            ← real html/body/CSS/fonts/providers
    page.tsx
  maintenance/
    layout.tsx            ← must have its own html/body + globals.css import
    page.tsx
```

---

## Project-Specific Overrides

When cloning base_system for a new project, add project-specific rules below this line. These override or extend the base rules above.

Examples of what to add here:

- Project name and domain
- Additional locales beyond en/jp
- Payment provider (Stripe, etc.) and its patterns
- Custom modules added to src/lib/
- Third-party integrations and their API patterns
- Domain-specific business rules
- Deployment-specific configuration (custom Vercel settings, edge regions)

<!-- PROJECT OVERRIDES START -->

<!-- PROJECT OVERRIDES END -->

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
