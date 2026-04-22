# Base System

Industry-grade Next.js starter. Clone this for every new project — i18n, auth, email, database, security, SEO, monitoring, and CI/CD pre-configured and production-ready.

## Tech Stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Framework    | Next.js 16 (App Router)             |
| Language     | TypeScript (strict)                 |
| Styling      | Tailwind CSS + shadcn/ui            |
| i18n         | next-intl (en, jp)                  |
| Auth         | Supabase Auth (SSR cookies)         |
| Database     | Drizzle ORM + Supabase (PostgreSQL) |
| Email        | Resend + React Email                |
| Validation   | Zod + @t3-oss/env-nextjs            |
| Security     | Arcjet (rate limiting, bot shield)  |
| Linting      | Biome                               |
| Testing      | Vitest + Playwright                 |
| Monitoring   | Sentry + Vercel Analytics           |
| CI/CD        | GitHub Actions + Husky              |

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url> my-project && cd my-project
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in values — see docs/ENV.md for full reference

# 3. Start dev server
npm run dev
```

Zero environment variables are required for a successful build. All module-specific vars are optional and degrade gracefully when absent.

## Project Structure

```
src/
  app/          Next.js App Router (pages, layouts, API routes)
  components/   Shared UI (layout/, common/, ui/, dev/)
  features/     Feature modules (home/, contact/)
  hooks/        Global custom hooks
  lib/
    core/       Required — env validation, API pipeline, security, config
    auth/       Opt-in — Supabase Auth clients, auth guard, hooks
    database/   Opt-in — Drizzle client, schema, BaseRepository
    email/      Opt-in — Resend client, service, React Email templates
    monitoring/ Opt-in — Sentry, Vercel Analytics/SpeedInsights
    validators/ Standalone — shared Zod schemas
    seo/        Standalone — structured data schema factories
  config/       Site-wide configuration
  types/        TypeScript type definitions
  i18n/         Internationalisation config
  test/         Test setup, mocks, E2E specs
```

Remove an opt-in module by deleting its folder — no other config changes needed.

See [CONVENTIONS.md](./CONVENTIONS.md) for naming rules and [docs/DEVELOPER.md](./docs/DEVELOPER.md) for architecture deep-dives.

## Available Scripts

| Script                  | Description                          |
| ----------------------- | ------------------------------------ |
| `npm run dev`           | Start development server             |
| `npm run build`         | Production build                     |
| `npm run start`         | Start production server              |
| `npm run lint`          | Biome check                          |
| `npm run format`        | Biome format + fix                   |
| `npm run format:check`  | Biome format check (CI)              |
| `npm run type-check`    | TypeScript type check (no emit)      |
| `npm run test`          | Run all unit + integration tests     |
| `npm run test:watch`    | Vitest watch mode                    |
| `npm run test:coverage` | Tests with coverage report (80% min) |
| `npm run test:ui`       | Vitest browser UI                    |
| `npm run test:e2e`      | Playwright end-to-end tests          |
| `npm run db:generate`   | Generate Drizzle migration files     |
| `npm run db:migrate`    | Run migrations against the database  |
| `npm run db:push`       | Push schema directly (dev only)      |
| `npm run db:studio`     | Open Drizzle Studio                  |
| `npm run analyze`       | Bundle size analysis                 |

## Environment Variables

Copy `.env.example` to `.env.local`. See [docs/ENV.md](./docs/ENV.md) for the full reference.

```env
# Site (required to override defaults)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=My App

# Auth + Database (required if using auth/database modules)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...

# Email (required if using email module)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=hello@yourdomain.com
RESEND_ADMIN_EMAIL=admin@yourdomain.com

# Security (required for Arcjet rate limiting + bot protection)
ARCJET_KEY=ajkey_...

# Monitoring (required for Sentry)
SENTRY_DSN=https://...
```

All variables are validated at startup via `src/lib/core/env.ts`. Set `SKIP_ENV_VALIDATION=1` to bypass during CI builds.

## i18n

Locales defined in `src/i18n/routing.ts`. Translation files in `messages/`.

To add a locale:
1. Add the locale code to `src/i18n/routing.ts`
2. Create `messages/<locale>.json`

## API Routes

All API routes use the `withApi` pipeline from `src/lib/core/api/with-api.ts`:

```ts
export const POST = withApi(
  { schema: mySchema, rateLimit: 'api', csrf: true },
  async ({ data, user }) => {
    return successResponse(result);
  },
);
```

The pipeline runs in order: **CSRF check → rate limiting → auth → Zod validation → handler → error catch**. Never write raw route handlers — always wrap with `withApi`.

## Auth

Three Supabase SSR clients under `src/lib/auth/clients/`:
- `browser.ts` — Client Components
- `server.ts` — Server Components and Route Handlers
- `middleware.ts` — session refresh in middleware

Auth state is stored in httpOnly cookies (not localStorage). `authGuard` in `src/lib/auth/guard.ts` protects server-side routes.

## Database

Drizzle ORM with a `BaseRepository` pattern:

```ts
import { BaseRepository } from '@/lib/database/repository';

class UserRepository extends BaseRepository<typeof usersTable> {
  constructor() { super(usersTable); }
  // add custom queries as methods
}
```

`BaseRepository` provides `findAll()`, `create()`, and `delete()` out of the box.

## Email

Templates use React Email (`src/lib/email/templates/`) — all user input is automatically escaped. Send via `src/lib/email/service.ts`:

```ts
import { sendContactEmails } from '@/lib/email/service';
const result = await sendContactEmails(data);
```

## Security

See [SECURITY.md](./SECURITY.md) for OWASP coverage and incident response.

Key measures:
- **CSP**: nonce-based per-request in `middleware.ts` — `strict-dynamic`, no `unsafe-inline`/`unsafe-eval`
- **Rate limiting**: Arcjet token bucket via `withApi({ rateLimit })` — contact/api/auth/strict presets
- **Bot protection**: Arcjet shields on all API routes
- **CSRF**: Origin/Referer header validation on all state-changing routes
- **Security headers**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS (production only)
- **Input validation**: Zod schemas at all API boundaries
- **Env validation**: Fail-fast startup via `@t3-oss/env-nextjs`

## SEO

Structured data factory functions in `src/lib/seo/schema.ts` (Organization, WebSite, FAQPage, BreadcrumbList, Service, HowTo, Article). Inject via the `<JsonLd>` component. Enhanced sitemap and hreflang are auto-generated from `siteConfig.pages`.

## Testing

```bash
npm run test:coverage    # unit + integration — must stay above 80%
npm run test:e2e         # Playwright end-to-end
```

Tests live next to source in `__tests__/` directories. E2E specs in `src/test/e2e/`.

154 tests across 23 files as of v0.1.1.

## Dev Panel

A floating debug overlay available in `development` and `preview` environments only. Toggle with the backtick key. Zero production bundle impact — loaded via `next/dynamic`.

Features: environment info, page navigator, debug toggles, asset inspector, state simulator.

## Contributing

1. Branch from `main` (`feat/add-auth`, `fix/contact-form`)
2. Follow [CONVENTIONS.md](./CONVENTIONS.md)
3. Run `npm run build && npm run lint` before committing — both must pass clean
4. Maintain 80%+ test coverage
5. See [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) for the full workflow
