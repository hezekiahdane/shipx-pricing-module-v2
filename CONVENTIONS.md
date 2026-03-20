# Conventions

This document defines naming, structure, and coding conventions for this project.
Following these consistently makes the codebase predictable and easy to navigate.

## File & Folder Naming

| Entity               | Convention        | Example                                 |
| -------------------- | ----------------- | --------------------------------------- |
| Component files      | `PascalCase.tsx`  | `Navbar.tsx`, `ContactForm.tsx`         |
| Utility files        | `kebab-case.ts`   | `rate-limit.ts`, `api-client.ts`        |
| Hook files           | `useCamelCase.ts` | `useSmoothScroll.ts`                    |
| Type/interface files | `kebab-case.ts`   | `api.ts`, `database.ts`                 |
| Test files           | `*.test.ts(x)`    | `rate-limit.test.ts`, `Navbar.test.tsx` |
| E2E test files       | `*.spec.ts`       | `homepage.spec.ts`                      |
| Folders              | `kebab-case`      | `lib/`, `components/common/`            |

## Code Naming

| Entity                     | Convention                    | Example                                |
| -------------------------- | ----------------------------- | -------------------------------------- |
| React components           | `PascalCase`                  | `function Navbar()`                    |
| Functions                  | `camelCase`                   | `function sendContactEmails()`         |
| Variables                  | `camelCase`                   | `const userEmail = ...`                |
| Constants (truly constant) | `UPPER_SNAKE_CASE`            | `const MAX_RETRIES = 3`                |
| Config objects             | `camelCase`                   | `const siteConfig = { ... }`           |
| TypeScript types           | `PascalCase`                  | `type ContactFormData`                 |
| TypeScript interfaces      | `PascalCase`                  | `interface ApiResponse<T>`             |
| Zod schemas                | `camelCase` + `Schema` suffix | `const contactSchema = z.object(...)`  |
| Hooks                      | `useCamelCase`                | `const useSmoothScroll = () => ...`    |
| Environment variables      | `UPPER_SNAKE_CASE`            | `RESEND_API_KEY`                       |
| CSS custom properties      | `--category-name`             | `--primary-500`, `--text-h1-size`      |
| i18n keys                  | `camelCase` nested            | `homepage.heroTitle`, `metadata.title` |

## Project Structure

```
src/
  app/                    Next.js App Router
    [locale]/             Locale-scoped pages
      layout.tsx          Root layout with metadata
      page.tsx            Home page
      error.tsx           Error boundary
      not-found.tsx       404 page
      loading.tsx         Loading skeleton
    api/                  API route handlers
      contact/route.ts
      health/route.ts
    global-error.tsx      Root-level error boundary
    robots.ts             Robots.txt generator
    sitemap.ts            Sitemap generator
    globals.css           Global styles + design tokens

  components/
    ui/                   shadcn/ui primitives (auto-generated)
    layout/               Navbar, Footer — rendered on every page
    common/               Shared components (OptimizedImage, etc.)

  features/               Feature-based modules
    home/
      components/         Page-level components
      sections/           Section-level components
    contact/
      components/         ContactForm, etc.
      validators/         Feature-specific Zod schemas

  hooks/                  Global custom hooks

  lib/
    utils.ts              cn() and shared utilities
    env.ts                Validated env vars (import from here, not process.env)
    rate-limit.ts         Rate limiting
    sanitize.ts           Input sanitization
    csrf.ts               CSRF protection
    validators/           Shared Zod schemas (contact.schema.ts)
    resend/
      client.ts           Resend singleton
      service.ts          Email service functions
      templates/          React Email templates
    supabase/
      client.ts           Browser client
      server.ts           Server client
      middleware.ts       Middleware client
      repository.ts       BaseRepository pattern

  config/
    site.ts               Centralised site config

  types/
    api.ts                ApiResponse<T>, successResponse, errorResponse
    database.ts           Supabase generated types (auto-generated)

  i18n/
    routing.ts            Locale routing config
    request.ts            next-intl request config

  test/
    setup.ts              Vitest setup (jest-dom, MSW)
    utils.tsx             Custom render helper
    mocks/
      server.ts           MSW server
      handlers.ts         MSW request handlers
    e2e/                  Playwright E2E tests
```

## Component Rules

- One component per file
- Name the file the same as the exported component
- Prefer named exports for utilities, default exports for pages/components
- Props interface goes directly above the component function
- Keep components under 200 lines; extract sub-components if larger
- Avoid `any` — type everything explicitly

## API Routes

- Validate all input with Zod at the route level
- Apply rate limiting using `contactFormLimiter` or `apiLimiter`
- Apply CSRF check with `validateCsrfOrigin(req)` for mutations
- Return typed `ApiResponse<T>` via `successResponse()` / `errorResponse()`
- Log errors server-side with `console.error` (never leak stack traces to the client)

## Testing

- Test files live next to the code they test in `__tests__/` subdirectories
- E2E tests live in `src/test/e2e/`
- Use `@testing-library/user-event` for user interactions (not `fireEvent`)
- Mock external APIs with MSW handlers in `src/test/mocks/handlers.ts`
- Minimum 80% coverage (enforced by Vitest config)

## Import Order (enforced by Prettier/ESLint)

1. Node built-ins
2. External packages
3. Internal `@/` imports (types, libs, components)
4. Relative imports

## Caching & Deployment

- HTML pages and API routes must always serve fresh content after a deploy — set `Cache-Control: no-cache, no-store, must-revalidate` on all routes except static assets
- Static assets (`_next/static/`, `_next/image/`) are content-hashed by Next.js and safe to cache indefinitely — exclude them from the no-cache rule
- If a project serves custom static files (e.g. `/audio/`, `/og/`), exclude those paths too
- This is configured in `next.config.ts` via the `headers()` function alongside security headers
- **Never initialize SDK clients (Stripe, Resend, etc.) at module scope** in API routes — use lazy factory functions so builds succeed without env vars:

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

## CSS / Tailwind

- Use design tokens (CSS custom properties) for all brand values
- Prefer Tailwind utility classes over custom CSS
- Custom CSS only in `globals.css` under `@layer base`
- Use `cn()` from `@/lib/utils` for conditional class merging
- Never inline styles on components (`style={{ ... }}`)
