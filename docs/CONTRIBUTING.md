# Contributing Guide

## Prerequisites

- Node.js 20+
- npm or pnpm
- A Supabase project (for auth/database features)
- A Resend account (for email features)

## Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd base_system

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local and fill in your values (see docs/ENV.md)

# 4. Start the development server
npm run dev
```

## Available Scripts

<!-- AUTO-GENERATED -->

| Command                 | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| `npm run dev`           | Start Next.js development server with hot reload        |
| `npm run build`         | Production build with type checking                     |
| `npm run start`         | Start production server (run `build` first)             |
| `npm run lint`          | Lint TypeScript/JavaScript with ESLint                  |
| `npm run format`        | Format all files with Prettier                          |
| `npm run format:check`  | Check formatting without writing changes                |
| `npm run type-check`    | TypeScript type check without emitting output           |
| `npm run db:types`      | Generate TypeScript types from Supabase schema          |
| `npm run test`          | Run unit/integration tests once (Vitest)                |
| `npm run test:watch`    | Run tests in watch mode                                 |
| `npm run test:coverage` | Run tests with V8 coverage report                       |
| `npm run test:ui`       | Open Vitest UI in browser                               |
| `npm run test:e2e`      | Run Playwright end-to-end tests                         |
| `npm run analyze`       | Build with bundle analyzer (`ANALYZE=true`)             |
| `npm run prepare`       | Install Husky git hooks (runs automatically on install) |

<!-- /AUTO-GENERATED -->

## Testing

### Unit & Integration Tests (Vitest)

```bash
npm run test           # run once
npm run test:watch     # watch mode
npm run test:coverage  # with coverage report (target: 80%+)
```

Tests live in `src/lib/__tests__/`. New tests should follow the TDD workflow:

1. Write the test first (RED)
2. Implement to pass (GREEN)
3. Refactor (IMPROVE)

### End-to-End Tests (Playwright)

```bash
npm run test:e2e
```

E2E specs are in `src/test/e2e/`. Set `PLAYWRIGHT_BASE_URL` in `.env.local` to override the test target URL.

### Mock Service Worker

API mocks use MSW. Handlers are in `src/test/mocks/handlers.ts`. The mock server is started in `src/test/setup.ts`.

## Code Style

- **Formatter**: Prettier (runs automatically on staged files via lint-staged)
- **Linter**: ESLint with `eslint-config-next`
- **Pre-commit hook**: Prettier + ESLint run on `*.ts`, `*.tsx`, `*.js`, `*.mjs`, `*.cjs`, `*.json`, `*.css`, `*.md`

## Naming Conventions

| Type                  | Convention | Example                 |
| --------------------- | ---------- | ----------------------- |
| Folders & asset files | snake_case | `public/hero_image.png` |
| Hooks & utilities     | camelCase  | `useSmoothScroll.ts`    |
| Component files       | PascalCase | `Navbar.tsx`            |
| URL paths             | kebab-case | `/about-us`             |

## PR Checklist

- [ ] Tests pass (`npm run test`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] No type errors (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Coverage at 80%+ (`npm run test:coverage`)
- [ ] No hardcoded secrets or sensitive values
- [ ] Follows immutability and error-handling patterns
