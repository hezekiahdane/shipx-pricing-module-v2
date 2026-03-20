# base_system Modular Architecture Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure base_system's `src/lib/` into self-contained, opt-in modules with modern security (Arcjet), database (Drizzle), observability (Sentry), and tooling (Biome) upgrades.

**Architecture:** Single-repo modular architecture. `core/` is always required; `auth/`, `database/`, `email/`, `monitoring/` are opt-in — delete the folder to remove. All modules export through barrel `index.ts`. No circular dependencies.

**Tech Stack:** Next.js 16, @t3-oss/env-nextjs, @arcjet/next, drizzle-orm, @sentry/nextjs, @biomejs/biome

**Spec:** `docs/superpowers/specs/2026-03-20-modular-architecture-upgrade-design.md`

**Branch:** `feat/modular-architecture` (merge to `main` only after all phases pass)

---

## Phase 1: Core Module + Env Rewrite

### Task 1.1: Create feature branch and core directory structure

**Files:**

- Create: `src/lib/core/config/site.ts`
- Create: `src/lib/core/security/index.ts`
- Create: `src/lib/core/api/index.ts`
- Create: `src/lib/core/index.ts`

- [ ] **Step 1: Create the feature branch**

Run: `cd /Users/gochuicod/Documents/InfiGroup/base_system && git checkout -b feat/modular-architecture`

- [ ] **Step 2: Create directory structure**

Run: `mkdir -p src/lib/core/{config,security,api,__tests__}`

- [ ] **Step 3: Move `utils.ts` to `core/`**

Run: `git mv src/lib/utils.ts src/lib/core/utils.ts`

- [ ] **Step 4: Move `config/site.ts` to `core/config/`**

Run: `git mv src/config/site.ts src/lib/core/config/site.ts && rmdir src/config 2>/dev/null || true`

- [ ] **Step 5: Move `csrf.ts` to `core/security/`**

Run: `git mv src/lib/csrf.ts src/lib/core/security/csrf.ts`

- [ ] **Step 6: Move `sanitize.ts` to `core/security/`**

Run: `git mv src/lib/sanitize.ts src/lib/core/security/sanitize.ts`

- [ ] **Step 7: Move `ApiResponse` types to `core/api/response.ts`**

Run: `git mv src/types/api.ts src/lib/core/api/response.ts`

- [ ] **Step 8: Create `core/security/index.ts` barrel**

```typescript
// src/lib/core/security/index.ts
export { validateCsrfOrigin } from './csrf';
export {
  escapeHtml,
  stripHtml,
  normalizeWhitespace,
  sanitizeText,
} from './sanitize';
```

- [ ] **Step 9: Create `core/api/index.ts` barrel**

```typescript
// src/lib/core/api/index.ts
export {
  successResponse,
  errorResponse,
  type ApiResponse,
  type PaginationMeta,
} from './response';
```

- [ ] **Step 10: Create `core/index.ts` barrel**

```typescript
// src/lib/core/index.ts
export { cn } from './utils';
export { siteConfig, type SiteConfig } from './config/site';
export {
  successResponse,
  errorResponse,
  type ApiResponse,
  type PaginationMeta,
} from './api/response';
export {
  validateCsrfOrigin,
  escapeHtml,
  stripHtml,
  normalizeWhitespace,
  sanitizeText,
} from './security';
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor: create core module structure, move utils/security/api/config"
```

### Task 1.2: Rewrite env.ts with @t3-oss/env-nextjs

**Files:**

- Create: `src/lib/core/env.ts` (replaces `src/lib/env.ts`)
- Delete: `src/lib/env.ts`

- [ ] **Step 1: Install @t3-oss/env-nextjs**

Run: `cd /Users/gochuicod/Documents/InfiGroup/base_system && npm install @t3-oss/env-nextjs`

- [ ] **Step 2: Write the new env.ts**

```typescript
// src/lib/core/env.ts
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  // ─── Server-only vars (never exposed to browser) ─────────────────────────
  server: {
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),

    // Email module (optional)
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().email().optional(),
    RESEND_ADMIN_EMAIL: z.string().email().optional(),

    // Auth module (optional)
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

    // Database module (optional)
    DATABASE_URL: z.string().url().optional(),
    DATABASE_URL_DIRECT: z.string().url().optional(),

    // Security — Arcjet (optional, degrades gracefully)
    ARCJET_KEY: z.string().min(1).optional(),

    // Monitoring — Sentry (optional)
    SENTRY_DSN: z.string().url().optional(),
    SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
  },

  // ─── Client vars (exposed to browser via NEXT_PUBLIC_ prefix) ────────────
  client: {
    NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
    NEXT_PUBLIC_SITE_NAME: z.string().default('My App'),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  },

  // ─── Runtime values (maps env vars to the schema) ────────────────────────
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    RESEND_ADMIN_EMAIL: process.env.RESEND_ADMIN_EMAIL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_DIRECT: process.env.DATABASE_URL_DIRECT,
    ARCJET_KEY: process.env.ARCJET_KEY,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // Skip validation in edge runtime or during build
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  // Empty strings are treated as undefined
  emptyStringAsUndefined: true,
});
```

- [ ] **Step 3: Delete old env.ts**

Run: `rm src/lib/env.ts`

- [ ] **Step 4: Update `core/config/site.ts` to import from new env**

```typescript
// src/lib/core/config/site.ts
import { env } from '@/lib/core/env';

export const siteConfig = {
  name: env.NEXT_PUBLIC_SITE_NAME,
  description:
    'Built on the base system — fast, accessible, and production-ready.',
  url: env.NEXT_PUBLIC_SITE_URL,
  ogImage: '/og-image.png',
  locales: ['en', 'jp'] as const,
  defaultLocale: 'en' as const,
  navLinks: [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/#about' },
    { label: 'Contact', href: '/#contact' },
  ],
  social: {
    twitter: '',
    linkedin: '',
    github: '',
  },
} as const;

export type SiteConfig = typeof siteConfig;
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: rewrite env.ts with @t3-oss/env-nextjs, server/client separation"
```

### Task 1.3: Create typed error classes

**Files:**

- Create: `src/lib/core/api/errors.ts`
- Test: `src/lib/core/api/__tests__/errors.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/core/api/__tests__/errors.test.ts
import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
} from '../errors';

describe('AppError', () => {
  it('creates an error with status code and message', () => {
    const error = new AppError('Something went wrong', 500);
    expect(error.message).toBe('Something went wrong');
    expect(error.statusCode).toBe(500);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('ValidationError', () => {
  it('has status code 422', () => {
    const error = new ValidationError('Invalid input');
    expect(error.statusCode).toBe(422);
    expect(error.message).toBe('Invalid input');
  });
});

describe('NotFoundError', () => {
  it('has status code 404', () => {
    const error = new NotFoundError('Resource not found');
    expect(error.statusCode).toBe(404);
  });
});

describe('UnauthorizedError', () => {
  it('has status code 401', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Unauthorized');
  });
});

describe('ForbiddenError', () => {
  it('has status code 403', () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
  });
});

describe('RateLimitError', () => {
  it('has status code 429', () => {
    const error = new RateLimitError();
    expect(error.statusCode).toBe(429);
    expect(error.message).toBe('Too many requests');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/gochuicod/Documents/InfiGroup/base_system && npx vitest run src/lib/core/api/__tests__/errors.test.ts`
Expected: FAIL — module `../errors` not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/core/api/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 422);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/core/api/__tests__/errors.test.ts`
Expected: PASS

- [ ] **Step 5: Update `core/api/index.ts` barrel to include errors**

```typescript
// src/lib/core/api/index.ts
export {
  successResponse,
  errorResponse,
  type ApiResponse,
  type PaginationMeta,
} from './response';
export {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
} from './errors';
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add typed error classes (AppError, ValidationError, etc.)"
```

### Task 1.4: Move existing tests and update all import paths

**Files:**

- Move: `src/lib/__tests__/utils.test.ts` -> `src/lib/core/__tests__/utils.test.ts`
- Move: `src/lib/__tests__/csrf.test.ts` -> `src/lib/core/security/__tests__/csrf.test.ts`
- Move: `src/lib/__tests__/sanitize.test.ts` -> `src/lib/core/security/__tests__/sanitize.test.ts`
- Move: `src/lib/__tests__/contact-schema.test.ts` -> `src/lib/validators/__tests__/contact-schema.test.ts`
- Modify: All files importing from old paths

- [ ] **Step 1: Move test files**

```bash
cd /Users/gochuicod/Documents/InfiGroup/base_system
mkdir -p src/lib/core/security/__tests__
mkdir -p src/lib/validators/__tests__
git mv src/lib/__tests__/utils.test.ts src/lib/core/__tests__/utils.test.ts
git mv src/lib/__tests__/csrf.test.ts src/lib/core/security/__tests__/csrf.test.ts
git mv src/lib/__tests__/sanitize.test.ts src/lib/core/security/__tests__/sanitize.test.ts
git mv src/lib/__tests__/contact-schema.test.ts src/lib/validators/__tests__/contact-schema.test.ts
```

- [ ] **Step 2: Update test import paths**

In `src/lib/core/__tests__/utils.test.ts`: change `from '../utils'` to `from '../utils'` (no change needed — relative path still works)

In `src/lib/core/security/__tests__/csrf.test.ts`: change `from '../csrf'` to `from '../csrf'` (no change needed)

In `src/lib/core/security/__tests__/sanitize.test.ts`: change `from '../sanitize'` to `from '../sanitize'` (no change needed)

In `src/lib/validators/__tests__/contact-schema.test.ts`: change `from '../validators/contact.schema'` to `from '../contact.schema'`

- [ ] **Step 3: Update all source file imports across the project**

Search and replace across the codebase:

- `@/lib/env` -> `@/lib/core/env`
- `@/lib/utils` -> `@/lib/core/utils`
- `@/lib/csrf` -> `@/lib/core/security/csrf`
- `@/lib/sanitize` -> `@/lib/core/security/sanitize`
- `@/types/api` -> `@/lib/core/api/response`
- `@/config/site` -> `@/lib/core/config/site`

Key files to update:

- `src/app/api/contact/route.ts` — update csrf, rate-limit, and api imports
- `src/app/api/health/route.ts` — update api import
- `src/app/[locale]/layout.tsx` — update site config import
- `src/lib/resend/client.ts` — update env import
- `src/lib/resend/service.ts` — update env and validator imports
- `src/app/robots.ts` — update site config import
- `src/app/sitemap.ts` — update site config import
- Any component importing from `@/config/site`

- [ ] **Step 4: Create `validators/index.ts` barrel**

```typescript
// src/lib/validators/index.ts
export { contactSchema, type ContactFormData } from './contact.schema';
```

- [ ] **Step 5: Delete empty old directories**

```bash
rmdir src/lib/__tests__ 2>/dev/null || true
rmdir src/types 2>/dev/null || true
```

Note: only delete `src/types` if `database.ts` is the only remaining file. If so, move it to `src/lib/database/types.ts` in Phase 3. If not empty, leave it.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 7: Run build**

Run: `npm run build`
Expected: Build succeeds with zero errors

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: update all imports to new core module paths, move tests"
```

---

## Phase 2: Security — Arcjet + CSP + withApi wrapper

### Task 2.1: Install Arcjet and create the client

**Files:**

- Create: `src/lib/core/security/arcjet.ts`
- Test: `src/lib/core/security/__tests__/arcjet.test.ts`

- [ ] **Step 1: Install @arcjet/next**

Run: `cd /Users/gochuicod/Documents/InfiGroup/base_system && npm install @arcjet/next`

- [ ] **Step 2: Write the failing test**

```typescript
// src/lib/core/security/__tests__/arcjet.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @arcjet/next before imports
vi.mock('@arcjet/next', () => {
  const mockProtect = vi.fn().mockResolvedValue({
    isDenied: () => false,
    reason: { type: 'ALLOWED' },
  });
  const mockWithRule = vi.fn().mockReturnValue({ protect: mockProtect });
  const mockArcjet = vi.fn().mockReturnValue({
    withRule: mockWithRule,
    protect: mockProtect,
  });
  return {
    default: mockArcjet,
    shield: vi.fn().mockReturnValue({}),
    detectBot: vi.fn().mockReturnValue({}),
    tokenBucket: vi.fn().mockReturnValue({}),
    validateEmail: vi.fn().mockReturnValue({}),
  };
});

describe('Arcjet client', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns allow when ARCJET_KEY is missing', async () => {
    vi.stubEnv('ARCJET_KEY', '');
    const { checkRateLimit } = await import('../arcjet');
    const result = await checkRateLimit('test-ip', 'api');
    expect(result.allowed).toBe(true);
  });

  it('exports rate limit presets', async () => {
    const { rateLimitPresets } = await import('../arcjet');
    expect(rateLimitPresets.contact).toBeDefined();
    expect(rateLimitPresets.api).toBeDefined();
    expect(rateLimitPresets.auth).toBeDefined();
    expect(rateLimitPresets.strict).toBeDefined();
  });

  it('calls Arcjet protect and returns denied when rate limited', async () => {
    vi.stubEnv('ARCJET_KEY', 'test-key-123');
    // Re-mock to return denied
    const { default: arcjetMock } = await import('@arcjet/next');
    const mockProtect = vi.fn().mockResolvedValue({
      isDenied: () => true,
      reason: { type: 'RATE_LIMIT' },
    });
    (arcjetMock as unknown as vi.Mock).mockReturnValue({
      withRule: vi.fn().mockReturnValue({ protect: mockProtect }),
      protect: mockProtect,
    });

    const { checkRateLimit } = await import('../arcjet');
    const result = await checkRateLimit('1.2.3.4', 'strict');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('RATE_LIMIT');
  });

  it('returns allow when Arcjet throws an error', async () => {
    vi.stubEnv('ARCJET_KEY', 'test-key-123');
    const { default: arcjetMock } = await import('@arcjet/next');
    const mockProtect = vi.fn().mockRejectedValue(new Error('network error'));
    (arcjetMock as unknown as vi.Mock).mockReturnValue({
      withRule: vi.fn().mockReturnValue({ protect: mockProtect }),
      protect: mockProtect,
    });

    const { checkRateLimit } = await import('../arcjet');
    const result = await checkRateLimit('1.2.3.4', 'api');
    expect(result.allowed).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/core/security/__tests__/arcjet.test.ts`
Expected: FAIL

- [ ] **Step 4: Write the implementation**

```typescript
// src/lib/core/security/arcjet.ts
import arcjet, {
  shield,
  detectBot,
  tokenBucket,
  validateEmail,
} from '@arcjet/next';

export const rateLimitPresets = {
  contact: { refillRate: 5, interval: '1m', capacity: 5 },
  api: { refillRate: 60, interval: '1m', capacity: 60 },
  auth: { refillRate: 10, interval: '5m', capacity: 10 },
  strict: { refillRate: 3, interval: '1m', capacity: 3 },
} as const;

export type RateLimitPreset = keyof typeof rateLimitPresets;

let warnedOnce = false;

function isArcjetConfigured(): boolean {
  const configured = !!process.env.ARCJET_KEY;
  if (!configured && !warnedOnce) {
    console.warn(
      'ARCJET_KEY not set — security protections disabled (rate limiting, WAF, bot detection)',
    );
    warnedOnce = true;
  }
  return configured;
}

// Base Arcjet client with Shield WAF + bot detection
const aj = arcjet({
  key: process.env.ARCJET_KEY ?? 'dummy-key-for-init',
  characteristics: ['ip.src'],
  rules: [
    shield({ mode: 'LIVE' }),
    detectBot({ mode: 'LIVE', allow: ['CATEGORY:SEARCH_ENGINE'] }),
  ],
});

interface RateLimitResult {
  allowed: boolean;
  reason?: string;
}

export async function checkRateLimit(
  ip: string,
  preset: RateLimitPreset,
): Promise<RateLimitResult> {
  if (!isArcjetConfigured()) {
    return { allowed: true };
  }

  try {
    const config = rateLimitPresets[preset];

    // Dynamically add tokenBucket rule for the requested preset
    const ajWithRate = aj.withRule(
      tokenBucket({
        mode: 'LIVE',
        refillRate: config.refillRate,
        interval: config.interval,
        capacity: config.capacity,
      }),
    );

    const decision = await ajWithRate.protect(
      { ip, headers: new Headers() } as Parameters<
        typeof ajWithRate.protect
      >[0],
      { requested: 1 },
    );

    return {
      allowed: !decision.isDenied(),
      reason: decision.isDenied() ? decision.reason.type : undefined,
    };
  } catch (error) {
    console.error('Arcjet error (allowing request):', error);
    return { allowed: true };
  }
}

/**
 * Validate an email address for disposable/invalid domains.
 * Returns true if the email is valid, false if suspicious.
 * Degrades gracefully when ARCJET_KEY is missing.
 */
export async function checkEmail(email: string): Promise<boolean> {
  if (!isArcjetConfigured()) {
    return true;
  }

  try {
    const ajWithEmail = aj.withRule(
      validateEmail({
        mode: 'LIVE',
        deny: ['DISPOSABLE', 'INVALID', 'NO_MX_RECORDS'],
      }),
    );

    const decision = await ajWithEmail.protect({
      ip: '127.0.0.1',
      headers: new Headers(),
      email,
    } as Parameters<typeof ajWithEmail.protect>[0]);

    return !decision.isDenied();
  } catch (error) {
    console.error('Arcjet email validation error (allowing):', error);
    return true;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/core/security/__tests__/arcjet.test.ts`
Expected: PASS

- [ ] **Step 6: Update `core/security/index.ts`**

Add to existing exports:

```typescript
export {
  checkRateLimit,
  checkEmail,
  rateLimitPresets,
  type RateLimitPreset,
} from './arcjet';
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Arcjet security client with graceful degradation"
```

### Task 2.2: Create CSP nonce generation

**Files:**

- Create: `src/lib/core/security/csp.ts`
- Test: `src/lib/core/security/__tests__/csp.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/core/security/__tests__/csp.test.ts
import { describe, it, expect } from 'vitest';
import { generateCspNonce, buildCspHeader } from '../csp';

describe('generateCspNonce', () => {
  it('returns a base64 string', () => {
    const nonce = generateCspNonce();
    expect(() => Buffer.from(nonce, 'base64')).not.toThrow();
  });

  it('returns a string of expected length (16 bytes = 24 base64 chars)', () => {
    const nonce = generateCspNonce();
    expect(nonce.length).toBeGreaterThanOrEqual(22);
    expect(nonce.length).toBeLessThanOrEqual(24);
  });

  it('generates unique nonces on each call', () => {
    const nonce1 = generateCspNonce();
    const nonce2 = generateCspNonce();
    expect(nonce1).not.toBe(nonce2);
  });
});

describe('buildCspHeader', () => {
  it('includes the nonce in script-src', () => {
    const nonce = 'test-nonce-123';
    const header = buildCspHeader(nonce);
    expect(header).toContain(`'nonce-${nonce}'`);
  });

  it('includes strict-dynamic', () => {
    const header = buildCspHeader('test');
    expect(header).toContain("'strict-dynamic'");
  });

  it('includes frame-ancestors none', () => {
    const header = buildCspHeader('test');
    expect(header).toContain("frame-ancestors 'none'");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/core/security/__tests__/csp.test.ts`
Expected: FAIL — module `../csp` not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/core/security/csp.ts
import { randomBytes } from 'crypto';

export function generateCspNonce(): string {
  return randomBytes(16).toString('base64');
}

export function buildCspHeader(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/core/security/__tests__/csp.test.ts`
Expected: PASS

- [ ] **Step 5: Add to `core/security/index.ts`**

Add: `export { generateCspNonce, buildCspHeader } from './csp';`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add nonce-based CSP generation"
```

### Task 2.3: Create `withApi` route handler wrapper

**Files:**

- Create: `src/lib/core/api/with-api.ts`
- Test: `src/lib/core/api/__tests__/with-api.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/core/api/__tests__/with-api.test.ts
import { describe, it, expect, vi } from 'vitest';
import { withApi } from '../with-api';
import { successResponse } from '../response';
import { z } from 'zod';

// Mock Arcjet to always allow
vi.mock('@/lib/core/security/arcjet', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitPresets: {
    contact: { max: 5, window: '1m' },
    api: { max: 60, window: '1m' },
    auth: { max: 10, window: '5m' },
    strict: { max: 3, window: '1m' },
  },
}));

const testSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request('http://localhost:3000/api/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('withApi', () => {
  it('validates input and passes typed data to handler', async () => {
    const handler = withApi(
      { schema: testSchema, csrf: false },
      async ({ data }) => successResponse(data),
    );

    const req = makeRequest({ name: 'Test', email: 'test@test.com' });
    const res = await handler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.name).toBe('Test');
  });

  it('returns 422 for invalid input', async () => {
    const handler = withApi(
      { schema: testSchema, csrf: false },
      async ({ data }) => successResponse(data),
    );

    const req = makeRequest({ name: '', email: 'invalid' });
    const res = await handler(req);

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('works without a schema', async () => {
    const handler = withApi({ csrf: false }, async ({ request }) =>
      successResponse({ ok: true }),
    );

    const req = makeRequest({});
    const res = await handler(req);

    expect(res.status).toBe(200);
  });

  it('catches AppError and returns correct status', async () => {
    const { NotFoundError } = await import('../errors');
    const handler = withApi({ csrf: false }, async () => {
      throw new NotFoundError('Item not found');
    });

    const req = makeRequest({});
    const res = await handler(req);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Item not found');
  });

  it('returns 500 for unknown errors', async () => {
    const handler = withApi({ csrf: false }, async () => {
      throw new Error('unexpected');
    });

    const req = makeRequest({});
    const res = await handler(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/core/api/__tests__/with-api.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/core/api/with-api.ts
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import type { ApiResponse } from './response';
import { errorResponse } from './response';
import { AppError } from './errors';
import { validateCsrfOrigin } from '@/lib/core/security/csrf';
import {
  checkRateLimit,
  type RateLimitPreset,
} from '@/lib/core/security/arcjet';

interface WithApiOptions<TSchema extends z.ZodType = z.ZodType> {
  schema?: TSchema;
  rateLimit?: RateLimitPreset;
  csrf?: boolean;
  auth?: boolean;
}

interface ApiContext<T = unknown> {
  data: T;
  request: Request;
  user?: unknown; // Populated when auth: true — typed as User when auth module is present
}

type ApiHandler<T = unknown> = (
  context: ApiContext<T>,
) => Promise<ApiResponse<unknown>>;

export function withApi<TSchema extends z.ZodType>(
  options: WithApiOptions<TSchema>,
  handler: ApiHandler<z.infer<TSchema>>,
) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      // 1. CSRF check (default: true for mutations)
      const shouldCheckCsrf = options.csrf ?? true;
      if (shouldCheckCsrf && !validateCsrfOrigin(request)) {
        return NextResponse.json(errorResponse('Forbidden'), { status: 403 });
      }

      // 2. Rate limiting
      if (options.rateLimit) {
        const ip =
          request.headers.get('x-forwarded-for') ??
          request.headers.get('x-real-ip') ??
          'anonymous';
        const { allowed } = await checkRateLimit(ip, options.rateLimit);
        if (!allowed) {
          return NextResponse.json(
            errorResponse('Too many requests. Please try again later.'),
            { status: 429, headers: { 'Retry-After': '60' } },
          );
        }
      }

      // 3. Auth check (requires auth module to be present)
      let user: unknown = undefined;
      if (options.auth) {
        try {
          // Dynamic import — only works if auth module exists
          const { createServerClient } = await import('@/lib/auth');
          const supabase = await createServerClient();
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();
          if (!authUser) {
            return NextResponse.json(errorResponse('Unauthorized'), {
              status: 401,
            });
          }
          user = authUser;
        } catch {
          // Auth module not present — reject if auth was required
          return NextResponse.json(
            errorResponse('Auth module not configured'),
            { status: 500 },
          );
        }
      }

      // 4. Parse and validate body
      let data: z.infer<TSchema> = undefined as z.infer<TSchema>;
      if (options.schema) {
        const body = await request.json();
        const result = options.schema.safeParse(body);
        if (!result.success) {
          return NextResponse.json(
            {
              ...errorResponse('Validation failed'),
              details: result.error.flatten(),
            },
            { status: 422 },
          );
        }
        data = result.data;
      }

      // 5. Execute handler
      const response = await handler({ data, request, user });
      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      // Known application errors
      if (error instanceof AppError) {
        return NextResponse.json(errorResponse(error.message), {
          status: error.statusCode,
        });
      }

      // Unknown errors
      console.error('API error:', error);
      return NextResponse.json(errorResponse('Internal server error'), {
        status: 500,
      });
    }
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/core/api/__tests__/with-api.test.ts`
Expected: PASS

- [ ] **Step 5: Update `core/api/index.ts`**

Add: `export { withApi } from './with-api';`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add withApi route handler wrapper (validation + rate limit + CSRF + errors)"
```

### Task 2.4: Refactor contact route and update middleware

**Files:**

- Modify: `src/app/api/contact/route.ts`
- Modify: `middleware.ts`
- Delete: `src/lib/rate-limit.ts`
- Delete: `src/lib/__tests__/rate-limit.test.ts` (if still exists)
- Modify: `next.config.ts` (CSP header)

- [ ] **Step 1: Rewrite contact route to use withApi**

Note: Still imports from `@/lib/resend/service` — will be updated to `@/lib/email/service` in Phase 4 (Task 4.1 Step 4).

```typescript
// src/app/api/contact/route.ts
import { withApi } from '@/lib/core/api/with-api';
import { successResponse, errorResponse } from '@/lib/core/api/response';
import { contactSchema } from '@/lib/validators/contact.schema';
import { sendContactEmails } from '@/lib/resend/service';

export const POST = withApi(
  {
    schema: contactSchema,
    rateLimit: 'contact',
    csrf: true,
  },
  async ({ data }) => {
    const result = await sendContactEmails(data);

    if (!result.success) {
      throw new Error('Failed to send message');
    }

    return successResponse(null);
  },
);
```

- [ ] **Step 2: Update middleware.ts for CSP nonce**

```typescript
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';
import { generateCspNonce, buildCspHeader } from '@/lib/core/security/csp';

const intlMiddleware = createIntlMiddleware(routing);

export default function middleware(request: NextRequest) {
  // 1. i18n routing
  const response = intlMiddleware(request);

  // 2. CSP nonce generation
  const nonce = generateCspNonce();
  response.headers.set('x-nonce', nonce);
  response.headers.set('Content-Security-Policy', buildCspHeader(nonce));

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

- [ ] **Step 3: Remove static CSP from next.config.ts**

In `next.config.ts`, remove the Content-Security-Policy entry from `securityHeaders` array (it's now handled by middleware). Keep all other security headers.

- [ ] **Step 4: Delete rate-limit.ts and its test**

```bash
rm -f src/lib/rate-limit.ts
rm -f src/lib/__tests__/rate-limit.test.ts 2>/dev/null || true
```

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 6: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: refactor contact route to use withApi, add nonce CSP middleware, remove in-memory rate limiter"
```

---

## Phase 3: Auth + Database Modules

### Task 3.1: Create auth module

**Files:**

- Create: `src/lib/auth/clients/browser.ts` (from supabase/client.ts)
- Create: `src/lib/auth/clients/server.ts` (from supabase/server.ts)
- Create: `src/lib/auth/clients/middleware.ts` (from supabase/middleware.ts)
- Create: `src/lib/auth/guard.ts`
- Create: `src/lib/auth/hooks.ts`
- Create: `src/lib/auth/types.ts`
- Create: `src/lib/auth/index.ts`

- [ ] **Step 1: Create auth directory and move files**

```bash
cd /Users/gochuicod/Documents/InfiGroup/base_system
mkdir -p src/lib/auth/clients
git mv src/lib/supabase/client.ts src/lib/auth/clients/browser.ts
git mv src/lib/supabase/server.ts src/lib/auth/clients/server.ts
git mv src/lib/supabase/middleware.ts src/lib/auth/clients/middleware.ts
```

- [ ] **Step 2: Update imports in moved files**

In `src/lib/auth/clients/server.ts`: change `import { env } from '@/lib/env'` references if any (currently uses `process.env` directly — no change needed)

- [ ] **Step 3: Create auth types**

```typescript
// src/lib/auth/types.ts
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export type User = SupabaseUser;
export type { Session };
```

- [ ] **Step 4: Create auth guard**

```typescript
// src/lib/auth/guard.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PROTECTED_ROUTES = ['/dashboard', '/settings', '/admin'];

export function authGuard(
  request: NextRequest,
  response: NextResponse,
  hasSession: boolean,
): NextResponse {
  const pathname = request.nextUrl.pathname;

  // Remove locale prefix for matching (e.g., /en/dashboard -> /dashboard)
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';

  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathWithoutLocale.startsWith(route),
  );

  if (isProtected && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
```

- [ ] **Step 5: Create auth hooks**

```typescript
// src/lib/auth/hooks.ts
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/auth/clients/browser';
import type { User, Session } from '@/lib/auth/types';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, loading };
}
```

- [ ] **Step 6: Write auth guard tests**

```typescript
// src/lib/auth/__tests__/guard.test.ts
import { describe, it, expect } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { authGuard } from '../guard';

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, 'http://localhost:3000'));
}

describe('authGuard', () => {
  it('allows access to non-protected routes without session', () => {
    const req = makeRequest('/en');
    const res = NextResponse.next();
    const result = authGuard(req, res, false);
    expect(result.headers.get('location')).toBeNull();
  });

  it('redirects to login for protected route without session', () => {
    const req = makeRequest('/en/dashboard');
    const res = NextResponse.next();
    const result = authGuard(req, res, false);
    expect(result.status).toBe(307);
    expect(result.headers.get('location')).toContain('/login');
  });

  it('allows access to protected route with session', () => {
    const req = makeRequest('/en/dashboard');
    const res = NextResponse.next();
    const result = authGuard(req, res, true);
    expect(result.headers.get('location')).toBeNull();
  });

  it('includes redirect param in login URL', () => {
    const req = makeRequest('/en/settings');
    const res = NextResponse.next();
    const result = authGuard(req, res, false);
    const location = result.headers.get('location') ?? '';
    expect(location).toContain('redirect=%2Fen%2Fsettings');
  });
});
```

- [ ] **Step 7: Run auth guard tests**

Run: `npx vitest run src/lib/auth/__tests__/guard.test.ts`
Expected: PASS (guard.ts was already created in Step 4)

- [ ] **Step 8: Create auth barrel export**

```typescript
// src/lib/auth/index.ts
export { createClient as createBrowserClient } from './clients/browser';
export { createClient as createServerClient } from './clients/server';
export { createMiddlewareClient } from './clients/middleware';
export { authGuard } from './guard';
export { useUser, useSession } from './hooks';
export type { User, Session } from './types';
```

- [ ] **Step 7: Update imports across codebase**

Replace `@/lib/supabase/client` -> `@/lib/auth/clients/browser`
Replace `@/lib/supabase/server` -> `@/lib/auth/clients/server`
Replace `@/lib/supabase/middleware` -> `@/lib/auth/clients/middleware`

- [ ] **Step 10: Move repository.ts out before deleting supabase dir**

```bash
# repository.ts will be rewritten in Task 3.2, but preserve git history
git mv src/lib/supabase/repository.ts src/lib/database/repository-legacy.ts 2>/dev/null || true
```

- [ ] **Step 11: Delete old supabase directory**

```bash
rm -rf src/lib/supabase
```

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "refactor: create auth module from supabase clients, add guard + hooks + tests"
```

### Task 3.2: Create database module with Drizzle

**Files:**

- Create: `src/lib/database/client.ts`
- Create: `src/lib/database/schema/index.ts`
- Create: `src/lib/database/repository.ts` (refactored from supabase)
- Create: `src/lib/database/index.ts`
- Create: `drizzle.config.ts`

- [ ] **Step 1: Install Drizzle dependencies**

Run: `npm install drizzle-orm postgres && npm install -D drizzle-kit`

- [ ] **Step 2: Create Drizzle client**

```typescript
// src/lib/database/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

function createDrizzleClient() {
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. The database module requires a PostgreSQL connection string.',
    );
  }

  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

let dbInstance: ReturnType<typeof createDrizzleClient> | null = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = createDrizzleClient();
  }
  return dbInstance;
}

export type Database = ReturnType<typeof getDb>;
```

- [ ] **Step 3: Create example schema**

```typescript
// src/lib/database/schema/index.ts
// Add table definitions here as needed per project.
// Example:
//
// import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
//
// export const contacts = pgTable('contacts', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   name: text('name').notNull(),
//   email: text('email').notNull(),
//   message: text('message'),
//   createdAt: timestamp('created_at').defaultNow().notNull(),
// });
```

- [ ] **Step 4: Create Drizzle config at project root**

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/database/schema/index.ts',
  out: './src/lib/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL ?? '',
  },
});
```

- [ ] **Step 5: Refactor BaseRepository to use Drizzle**

```typescript
// src/lib/database/repository.ts
import { eq } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { getDb } from './client';

export class BaseRepository<
  TTable extends PgTable,
  TRow = TTable['$inferSelect'],
  TInsert = TTable['$inferInsert'],
> {
  constructor(protected readonly table: TTable) {}

  async findAll(): Promise<TRow[]> {
    const db = getDb();
    const rows = await db.select().from(this.table);
    return rows as TRow[];
  }

  async findById(id: string): Promise<TRow | null> {
    const db = getDb();
    const idColumn = (this.table as Record<string, unknown>)['id'];
    if (!idColumn) throw new Error('Table must have an "id" column');

    const rows = await db
      .select()
      .from(this.table)
      .where(
        eq(
          idColumn as ReturnType<
            typeof eq extends (a: infer A, ...args: unknown[]) => unknown
              ? () => A
              : never
          >,
          id,
        ),
      )
      .limit(1);

    return (rows[0] as TRow) ?? null;
  }

  async create(data: TInsert): Promise<TRow> {
    const db = getDb();
    const rows = await db
      .insert(this.table)
      .values(data as Record<string, unknown>)
      .returning();

    return rows[0] as TRow;
  }

  async update(id: string, data: Partial<TInsert>): Promise<TRow> {
    const db = getDb();
    const idColumn = (this.table as Record<string, unknown>)['id'];
    if (!idColumn) throw new Error('Table must have an "id" column');

    const rows = await db
      .update(this.table)
      .set(data as Record<string, unknown>)
      .where(eq(idColumn as Parameters<typeof eq>[0], id))
      .returning();

    return rows[0] as TRow;
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    const idColumn = (this.table as Record<string, unknown>)['id'];
    if (!idColumn) throw new Error('Table must have an "id" column');

    await db
      .delete(this.table)
      .where(eq(idColumn as Parameters<typeof eq>[0], id));
  }
}
```

- [ ] **Step 6: Create database barrel export**

```typescript
// src/lib/database/index.ts
export { getDb, type Database } from './client';
export { BaseRepository } from './repository';
```

- [ ] **Step 7: Add env vars to env.ts**

Already done in Task 1.2 — `DATABASE_URL` and `DATABASE_URL_DIRECT` are in the server schema as optional.

- [ ] **Step 8: Delete legacy repository file**

```bash
rm -f src/lib/database/repository-legacy.ts
```

Note: `repository.test.ts` is deferred — requires a test database (Supabase branch or local PostgreSQL). Per the spec's testing strategy, these are integration tests that run migrations, seed data, and clean up. Add when a test database is available.

- [ ] **Step 9: Add db scripts to package.json**

Add to `scripts`:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio"
```

- [ ] **Step 9: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add database module with Drizzle ORM, refactor BaseRepository"
```

---

## Phase 4: Email + Monitoring Modules

### Task 4.1: Create email module

**Files:**

- Move: `src/lib/resend/*` -> `src/lib/email/*`
- Create: `src/lib/email/index.ts`

- [ ] **Step 1: Move files**

```bash
cd /Users/gochuicod/Documents/InfiGroup/base_system
mkdir -p src/lib/email/templates
git mv src/lib/resend/client.ts src/lib/email/client.ts
git mv src/lib/resend/service.ts src/lib/email/service.ts
git mv src/lib/resend/templates/contact-admin.tsx src/lib/email/templates/contact-admin.tsx
git mv src/lib/resend/templates/contact-confirmation.tsx src/lib/email/templates/contact-confirmation.tsx
rm -rf src/lib/resend
```

- [ ] **Step 2: Update imports inside email module**

In `src/lib/email/client.ts`:

```typescript
import { Resend } from 'resend';
import { env } from '@/lib/core/env';

export const resend = env.RESEND_API_KEY
  ? new Resend(env.RESEND_API_KEY)
  : null;
```

In `src/lib/email/service.ts`: update imports to `@/lib/email/client`, `@/lib/email/templates/*`, `@/lib/core/env`, `@/lib/validators/contact.schema`. Also add null check for `resend` client.

- [ ] **Step 3: Create email barrel export**

```typescript
// src/lib/email/index.ts
export { resend } from './client';
export { sendContactEmails } from './service';
```

- [ ] **Step 4: Update contact route import**

In `src/app/api/contact/route.ts`: change `@/lib/resend/service` -> `@/lib/email/service`

- [ ] **Step 5: Update MSW handlers import paths if needed**

- [ ] **Step 6: Run tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: create email module from resend, add graceful degradation"
```

### Task 4.2: Create monitoring module (Sentry)

**Files:**

- Create: `src/lib/monitoring/sentry.ts`
- Create: `src/lib/monitoring/analytics.ts`
- Create: `src/lib/monitoring/index.ts`
- Create: `sentry.client.config.ts`
- Create: `sentry.server.config.ts`
- Create: `sentry.edge.config.ts`
- Create: `instrumentation.ts`
- Modify: `src/app/global-error.tsx`
- Modify: `src/app/[locale]/layout.tsx`

- [ ] **Step 1: Install Sentry**

Run: `npm install @sentry/nextjs`

- [ ] **Step 2: Create monitoring helper**

```typescript
// src/lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV,
    enabled: process.env.NODE_ENV === 'production',
  });
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (!SENTRY_DSN) {
    console.error(error);
    return;
  }
  Sentry.captureException(error, { extra: context });
}

export { Sentry };
```

- [ ] **Step 3: Create analytics wrapper**

```typescript
// src/lib/monitoring/analytics.ts
export { Analytics } from '@vercel/analytics/react';
export { SpeedInsights } from '@vercel/speed-insights/next';
```

- [ ] **Step 4: Create barrel export**

```typescript
// src/lib/monitoring/index.ts
export { initSentry, captureError, Sentry } from './sentry';
export { Analytics, SpeedInsights } from './analytics';
```

- [ ] **Step 5: Create Sentry config files at project root**

Note: Root-level files may not resolve the `@/` path alias. Use relative imports from root.

```typescript
// sentry.client.config.ts
import { initSentry } from './src/lib/monitoring/sentry';
initSentry();
```

```typescript
// sentry.server.config.ts
import { initSentry } from './src/lib/monitoring/sentry';
initSentry();
```

```typescript
// sentry.edge.config.ts
import { initSentry } from './src/lib/monitoring/sentry';
initSentry();
```

- [ ] **Step 6: Create instrumentation.ts**

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
```

- [ ] **Step 7: Update global-error.tsx to report to Sentry**

```typescript
// src/app/global-error.tsx
'use client';

import { captureError } from '@/lib/monitoring/sentry';
import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    captureError(error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center font-sans">
        <h1 className="text-3xl font-bold">Critical error</h1>
        <p className="max-w-md text-gray-600">
          A critical error occurred. Please refresh the page or contact support.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-2 max-w-xl overflow-auto rounded-lg bg-gray-100 p-4 text-left text-xs">
            {error.message}
          </pre>
        )}
        <button
          onClick={reset}
          className="mt-2 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
        >
          Reload
        </button>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Update layout.tsx to use monitoring module**

In `src/app/[locale]/layout.tsx`:

- Replace `import { Analytics } from '@vercel/analytics/react'` with `import { Analytics, SpeedInsights } from '@/lib/monitoring'`
- Remove `import { SpeedInsights } from '@vercel/speed-insights/next'`

- [ ] **Step 9: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add monitoring module (Sentry + analytics), report errors from global-error.tsx"
```

---

## Phase 5: Tooling Migration

### Task 5.1: Migrate ESLint + Prettier to Biome

**Files:**

- Create: `biome.json`
- Delete: `eslint.config.mjs`, `.prettierrc`, `.prettierignore`
- Modify: `package.json` (deps + scripts + lint-staged)

- [ ] **Step 1: Install Biome**

Run: `npm install -D @biomejs/biome`

- [ ] **Step 2: Create biome.json**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error"
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noConsoleLog": "warn"
      },
      "security": {
        "noDangerouslySetInnerHtml": "error"
      },
      "style": {
        "useConst": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 80
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  },
  "files": {
    "ignore": [
      "node_modules",
      ".next",
      "out",
      "build",
      "coverage",
      "playwright-report",
      "src/types/database.ts"
    ]
  }
}
```

- [ ] **Step 3: Remove old linting packages**

Run: `npm uninstall eslint eslint-config-next prettier`

- [ ] **Step 4: Delete old config files**

```bash
rm -f eslint.config.mjs .prettierrc .prettierignore
```

- [ ] **Step 5: Update package.json scripts**

Replace:

```json
"lint": "biome check .",
"format": "biome check --write .",
"format:check": "biome check ."
```

Update lint-staged:

```json
"lint-staged": {
  "*.{ts,tsx,js,mjs,cjs,json,css,md}": ["biome check --write --staged"]
}
```

- [ ] **Step 6: Verify `type-check` script exists in package.json**

Run: `grep '"type-check"' package.json`
If missing, add `"type-check": "tsc --noEmit"` to the scripts object.

- [ ] **Step 7: Run Biome to format entire codebase**

Run: `npx biome check --write .`

- [ ] **Step 7: Run build to verify nothing broke**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: migrate ESLint + Prettier to Biome"
```

### Task 5.2: Enable React Compiler and PPR

**Files:**

- Modify: `next.config.ts`
- Modify: `.vscode/settings.json` (if exists)

- [ ] **Step 1: Update next.config.ts**

Add to the `nextConfig` object:

```typescript
experimental: {
  reactCompiler: true,
  ppr: true,  // verify this key at implementation time
},
```

- [ ] **Step 2: Search for useMemo/useCallback that can be removed**

Run: `grep -rn 'useMemo\|useCallback' src/ --include='*.tsx' --include='*.ts'`

Remove any found instances (React Compiler handles memoization automatically).

- [ ] **Step 3: Update VS Code settings for Biome**

Create or update `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "perf: enable React Compiler and Partial Prerendering"
```

---

## Phase 6: CI/CD + Cleanup

### Task 6.1: Create GitHub Actions workflows

**Files:**

- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/e2e.yml`

- [ ] **Step 1: Create CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Biome check
        run: npx biome check .

      - name: Type check
        run: npm run type-check

      - name: Unit tests
        run: npm run test:coverage

      - name: Build
        run: npm run build
        env:
          SKIP_ENV_VALIDATION: true
```

- [ ] **Step 2: Create E2E workflow**

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Build
        run: npm run build
        env:
          SKIP_ENV_VALIDATION: true

      - name: Run E2E tests
        run: npm run test:e2e

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

- [ ] **Step 3: Commit**

```bash
mkdir -p .github/workflows
git add -A
git commit -m "ci: add GitHub Actions workflows for CI and E2E testing"
```

### Task 6.2: Wire Husky hooks

**Files:**

- Create: `.husky/pre-commit`
- Create: `.husky/pre-push`

- [ ] **Step 1: Create pre-commit hook**

```bash
echo 'npx lint-staged' > .husky/pre-commit
chmod +x .husky/pre-commit
```

- [ ] **Step 2: Create pre-push hook**

```bash
echo 'npm run type-check && npx vitest run' > .husky/pre-push
chmod +x .husky/pre-push
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "ci: wire husky pre-commit (biome) and pre-push (type-check + tests) hooks"
```

### Task 6.3: Update docs and cleanup

**Files:**

- Modify: `CONVENTIONS.md`
- Modify: `.env.example`

- [ ] **Step 1: Update .env.example with all new vars**

Add the new environment variables from the spec (DATABASE_URL, DATABASE_URL_DIRECT, ARCJET_KEY, SENTRY_DSN, SENTRY_AUTH_TOKEN, SKIP_ENV_VALIDATION). Mark optional ones clearly.

- [ ] **Step 2: Update CONVENTIONS.md**

Add a "Module Structure" section documenting:

- `core/` is required, everything else is opt-in
- Delete a module folder to remove it
- Import through barrel `index.ts` files only
- Update the import path conventions
- Document the `withApi` wrapper pattern
- Update linting section (Biome instead of ESLint + Prettier)

- [ ] **Step 3: Final full test run**

```bash
npm run build && npx vitest run --coverage && npx playwright test
```

Expected: All pass, coverage >= 80%

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: update CONVENTIONS.md and .env.example for modular architecture"
```

---

## Final Verification

- [ ] **Run full build:** `npm run build`
- [ ] **Run all unit tests:** `npx vitest run --coverage`
- [ ] **Run E2E tests:** `npx playwright test`
- [ ] **Verify coverage >= 80%**
- [ ] **Review git log:** `git log --oneline feat/modular-architecture`
- [ ] **Ready to merge to main**
