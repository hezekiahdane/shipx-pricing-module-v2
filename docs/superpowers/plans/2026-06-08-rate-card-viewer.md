# Rate Card Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only internal tool where authenticated users can browse rate cards and view their flattened rates table.

**Architecture:** Supabase Auth (email + password, session refreshed per-request in middleware) → Drizzle ORM queries over PostgreSQL → Next.js Server Components for read-only pages. Route group `(app)` holds guarded pages; `login` sits outside it. Middleware protects `/cards/*`; the `(app)` layout guards `/` via server-side session check.

**Tech Stack:** Next.js 16 App Router, Supabase Auth (`@/lib/auth`), Drizzle ORM (`@/lib/database`), Tailwind CSS, Vitest + Testing Library, Playwright.

---

## File Map

| File | New/Modify | Responsibility |
|------|-----------|----------------|
| `src/lib/database/schema/index.ts` | Modify | Drizzle table defs: `rateCards` + `rates` |
| `src/lib/database/queries/rate-cards.ts` | Create | `listRateCards`, `getRateCard`, `getRates` |
| `src/lib/auth/guard.ts` | Modify | Add `'/cards'` to PROTECTED_ROUTES |
| `middleware.ts` | Modify | Supabase session refresh + authGuard |
| `src/features/auth/actions.ts` | Create | `signIn` / `signOut` server actions |
| `src/features/auth/__tests__/actions.test.ts` | Create | Auth action unit tests |
| `src/features/auth/components/LoginForm.tsx` | Create | Client component: email + password form |
| `src/features/auth/components/__tests__/LoginForm.test.tsx` | Create | LoginForm render tests |
| `src/app/[locale]/login/page.tsx` | Create | Login page |
| `src/app/[locale]/(app)/layout.tsx` | Create | Session guard + app toolbar + sign-out |
| `src/app/[locale]/(app)/page.tsx` | Create | Rate cards list (RSC) |
| `src/features/rate-cards/components/RateCardGrid.tsx` | Create | Cards grid UI |
| `src/features/rate-cards/components/__tests__/RateCardGrid.test.tsx` | Create | Grid render tests |
| `src/app/[locale]/(app)/cards/[code]/page.tsx` | Create | Rate card detail (RSC) |
| `src/features/rate-cards/components/RatesTable.tsx` | Create | Rates data table UI |
| `src/features/rate-cards/components/__tests__/RatesTable.test.tsx` | Create | Table render + formatting tests |
| `src/test/e2e/rate-cards.spec.ts` | Create | E2E: login → list → detail → sign-out |

---

## Task 1: Database Schema

**Files:**
- Modify: `src/lib/database/schema/index.ts`

- [ ] **Step 1: Replace the schema stub**

Replace the entire file with:

```ts
import {
  bigserial,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

export const rateCards = pgTable('rate_cards', {
  code:          text('code').primaryKey(),
  productName:   text('product_name').notNull(),
  category:      text('category'),
  status:        text('status').default('Active'),
  operator:      text('operator'),
  serviceCode:   text('service_code'),
  effectiveDate: date('effective_date'),
  currency:      text('currency').default('VND'),
  sourceFile:    text('source_file'),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const rates = pgTable(
  'rates',
  {
    id:          bigserial('id', { mode: 'number' }).primaryKey(),
    cardCode:    text('card_code')
                   .notNull()
                   .references(() => rateCards.code, { onDelete: 'cascade' }),
    destination: text('destination').notNull(),
    zoneCode:    text('zone_code'),
    weightKg:    numeric('weight_kg').notNull(),
    unit:        text('unit').default('kg'),
    price:       numeric('price'),
  },
  (t) => [
    index('idx_rates_lookup').on(t.cardCode, t.destination, t.weightKg),
    unique().on(t.cardCode, t.destination, t.weightKg),
  ],
);

export type RateCard = typeof rateCards.$inferSelect;
export type Rate     = typeof rates.$inferSelect;
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Generate and apply migration**

```bash
npm run db:generate
npm run db:migrate
```

Expected: migration file created in `src/lib/database/migrations/`; tables `rate_cards` and `rates` exist in the database.

- [ ] **Step 4: Commit**

```bash
git add src/lib/database/schema/index.ts src/lib/database/migrations/
git commit -m "feat: add rate_cards and rates Drizzle schema"
```

---

## Task 2: Database Queries

**Files:**
- Create: `src/lib/database/queries/rate-cards.ts`

These are thin Drizzle wrappers with no business logic — correctness is verified by the E2E tests. TypeScript is the only gate here.

- [ ] **Step 1: Create the query file**

```ts
// src/lib/database/queries/rate-cards.ts
import { asc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/database';
import { rateCards, rates } from '@/lib/database/schema';
import type { RateCard, Rate } from '@/lib/database/schema';

export async function listRateCards(): Promise<
  Pick<RateCard, 'code' | 'productName' | 'category' | 'status' | 'currency' | 'effectiveDate'>[]
> {
  const db = getDb();
  return db
    .select({
      code:          rateCards.code,
      productName:   rateCards.productName,
      category:      rateCards.category,
      status:        rateCards.status,
      currency:      rateCards.currency,
      effectiveDate: rateCards.effectiveDate,
    })
    .from(rateCards)
    .orderBy(sql`${rateCards.category} NULLS LAST`, asc(rateCards.code));
}

export async function getRateCard(code: string): Promise<RateCard | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(rateCards)
    .where(eq(rateCards.code, code));
  return rows[0] ?? null;
}

export async function getRates(
  cardCode: string,
): Promise<Pick<Rate, 'destination' | 'zoneCode' | 'weightKg' | 'unit' | 'price'>[]> {
  const db = getDb();
  return db
    .select({
      destination: rates.destination,
      zoneCode:    rates.zoneCode,
      weightKg:    rates.weightKg,
      unit:        rates.unit,
      price:       rates.price,
    })
    .from(rates)
    .where(eq(rates.cardCode, cardCode))
    .orderBy(asc(rates.weightKg), asc(rates.destination));
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/database/queries/rate-cards.ts
git commit -m "feat: add rate card query functions"
```

---

## Task 3: Auth Server Actions

**Files:**
- Create: `src/features/auth/actions.ts`
- Create: `src/features/auth/__tests__/actions.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/auth/__tests__/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/lib/auth/clients/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
  }),
}));

const { redirect } = await import('next/navigation');
const { signIn, signOut } = await import('../actions');

beforeEach(() => {
  vi.clearAllMocks();
  mockSignOut.mockResolvedValue({});
});

describe('signIn', () => {
  it('calls signInWithPassword with form data values', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    fd.set('password', 'secret');

    await signIn(undefined, fd);

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret',
    });
  });

  it('redirects to / on success', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    fd.set('password', 'secret');

    await signIn(undefined, fd);

    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('returns error object on invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    fd.set('password', 'wrong');

    const result = await signIn(undefined, fd);

    expect(result).toEqual({ error: 'Invalid email or password' });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('signOut', () => {
  it('calls supabase signOut and redirects to /login', async () => {
    await signOut();

    expect(mockSignOut).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('/login');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/features/auth/__tests__/actions.test.ts
```

Expected: FAIL — `Cannot find module '../actions'`

- [ ] **Step 3: Implement the server actions**

```ts
// src/features/auth/actions.ts
'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/auth/clients/server';

export async function signIn(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });
  if (error) return { error: 'Invalid email or password' };
  redirect('/');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/features/auth/__tests__/actions.test.ts
```

Expected: 4/4 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/actions.ts src/features/auth/__tests__/actions.test.ts
git commit -m "feat: add signIn and signOut server actions"
```

---

## Task 4: Login Form + Page

**Files:**
- Create: `src/features/auth/components/LoginForm.tsx`
- Create: `src/features/auth/components/__tests__/LoginForm.test.tsx`
- Create: `src/app/[locale]/login/page.tsx`

- [ ] **Step 1: Write failing component tests**

```tsx
// src/features/auth/components/__tests__/LoginForm.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock useActionState so we can control form state in tests
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, useActionState: vi.fn() };
});

import LoginForm from '../LoginForm';

beforeEach(() => {
  vi.mocked(React.useActionState).mockReturnValue([undefined, vi.fn(), false]);
});

describe('LoginForm', () => {
  it('renders email input, password input and submit button', () => {
    render(<LoginForm />);
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows error message when state contains an error', () => {
    vi.mocked(React.useActionState).mockReturnValue([
      { error: 'Invalid email or password' },
      vi.fn(),
      false,
    ]);
    render(<LoginForm />);
    expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
  });

  it('disables submit button and changes label while pending', () => {
    vi.mocked(React.useActionState).mockReturnValue([undefined, vi.fn(), true]);
    render(<LoginForm />);
    const btn = screen.getByRole('button', { name: /signing in/i });
    expect(btn).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/features/auth/components/__tests__/LoginForm.test.tsx
```

Expected: FAIL — `Cannot find module '../LoginForm'`

- [ ] **Step 3: Implement LoginForm**

```tsx
// src/features/auth/components/LoginForm.tsx
'use client';
import { useActionState } from 'react';
import { signIn } from '../actions';

export default function LoginForm() {
  const [state, action, pending] = useActionState(signIn, undefined);

  return (
    <form action={action} className="w-80 space-y-3">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <input
        name="email"
        type="email"
        placeholder="Email"
        required
        className="w-full rounded border p-2"
      />
      <input
        name="password"
        type="password"
        placeholder="Password"
        required
        className="w-full rounded border p-2"
      />
      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-black p-2 text-white disabled:opacity-50"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/features/auth/components/__tests__/LoginForm.test.tsx
```

Expected: 3/3 PASS.

- [ ] **Step 5: Create the login page**

```tsx
// src/app/[locale]/login/page.tsx
import LoginForm from '@/features/auth/components/LoginForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <LoginForm />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/components/LoginForm.tsx src/features/auth/components/__tests__/LoginForm.test.tsx "src/app/[locale]/login/page.tsx"
git commit -m "feat: add login form component and login page"
```

---

## Task 5: Auth Guard + Middleware

**Files:**
- Modify: `src/lib/auth/guard.ts`
- Create: `src/lib/auth/__tests__/guard.test.ts`
- Modify: `middleware.ts`

> **Note:** `'/'` is intentionally NOT in PROTECTED_ROUTES — `startsWith('/')` would match everything including `/login`, creating a redirect loop. The home route is guarded by the `(app)` layout session check instead. Middleware only needs to protect `/cards/*`.

- [ ] **Step 1: Write failing guard tests**

```ts
// src/lib/auth/__tests__/guard.test.ts
import { describe, it, expect } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { authGuard } from '../guard';

function req(path: string) {
  return new NextRequest(`http://localhost:3000${path}`);
}

describe('authGuard', () => {
  it('allows unauthenticated access to /login', () => {
    const result = authGuard(req('/en/login'), NextResponse.next(), false);
    expect(result.status).toBe(200);
  });

  it('redirects unauthenticated access to /cards/* routes', () => {
    const result = authGuard(req('/en/cards/QSM'), NextResponse.next(), false);
    expect(result.status).toBe(307);
    expect(result.headers.get('location')).toContain('/login');
  });

  it('allows authenticated access to /cards/* routes', () => {
    const result = authGuard(req('/en/cards/QSM'), NextResponse.next(), true);
    expect(result.status).toBe(200);
  });

  it('does not redirect unauthenticated access to /en/ (home guarded by layout)', () => {
    const result = authGuard(req('/en/'), NextResponse.next(), false);
    expect(result.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run to confirm the /cards test fails**

```bash
npx vitest run src/lib/auth/__tests__/guard.test.ts
```

Expected: the `/cards` redirect test FAILS because `'/cards'` is not yet in PROTECTED_ROUTES.

- [ ] **Step 3: Update PROTECTED_ROUTES in `src/lib/auth/guard.ts`**

Change the constant from:

```ts
const PROTECTED_ROUTES = ['/dashboard', '/settings', '/admin'];
```

to:

```ts
const PROTECTED_ROUTES = ['/dashboard', '/settings', '/admin', '/cards'];
```

- [ ] **Step 4: Run guard tests — expect PASS**

```bash
npx vitest run src/lib/auth/__tests__/guard.test.ts
```

Expected: 4/4 PASS.

- [ ] **Step 5: Update `middleware.ts` to add Supabase session refresh**

Replace the full file with:

```ts
import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';
import { buildCspHeader, generateCspNonce } from './src/lib/core/security/csp';
import { createMiddlewareClient } from './src/lib/auth/clients/middleware';
import { authGuard } from './src/lib/auth/guard';

const intlMiddleware = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return NextResponse.rewrite(new URL('/maintenance', request.url));
  }

  const isDev =
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';

  const nonce = generateCspNonce();
  const csp = buildCspHeader(nonce);

  if (isDev) {
    const { pathname } = request.nextUrl;
    const rawBlocked = request.cookies.get('devpanel_blocked')?.value ?? '[]';
    let blocked: string[] = [];
    try {
      blocked = JSON.parse(rawBlocked) as string[];
    } catch {
      blocked = [];
    }

    if (blocked.length > 0) {
      const localePrefix = routing.locales.find(
        (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
      );
      const strippedPath = localePrefix
        ? pathname.slice(`/${localePrefix}`.length) || '/'
        : pathname;

      if (blocked.includes(strippedPath)) {
        const locale = localePrefix ?? routing.defaultLocale;
        const rewriteResponse = NextResponse.rewrite(
          new URL(`/${locale}/not-found`, request.url),
        );
        rewriteResponse.headers.set('Content-Security-Policy', csp);
        rewriteResponse.headers.set('x-nonce', nonce);
        return rewriteResponse;
      }
    }
  }

  // Refresh Supabase session so server components can read the current user.
  const response = NextResponse.next({ request });
  const supabase = createMiddlewareClient(request, response);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protect /cards/* — redirect unauthenticated users to /login.
  const guardResponse = authGuard(request, response, !!session);
  if (guardResponse !== response) {
    guardResponse.headers.set('Content-Security-Policy', csp);
    guardResponse.headers.set('x-nonce', nonce);
    return guardResponse;
  }

  // Apply i18n locale routing (locale prefix, default locale redirect).
  const intlResponse = intlMiddleware(request);
  intlResponse.headers.set('Content-Security-Policy', csp);
  intlResponse.headers.set('x-nonce', nonce);
  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth/guard.ts "src/lib/auth/__tests__/guard.test.ts" middleware.ts
git commit -m "feat: protect /cards routes in auth guard; add Supabase session refresh to middleware"
```

---

## Task 6: App Layout

The `(app)` layout is nested inside `[locale]/layout.tsx` (which renders the global Navbar + Footer). This layout adds a secondary toolbar with the app title and sign-out, and performs a server-side session check as a backstop for the home route `/`.

**Files:**
- Create: `src/app/[locale]/(app)/layout.tsx`

- [ ] **Step 1: Create the layout**

```tsx
// src/app/[locale]/(app)/layout.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/auth/clients/server';
import { signOut } from '@/features/auth/actions';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect('/login');

  return (
    <div>
      <header className="flex items-center justify-between border-b bg-white px-6 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Rate Cards
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Sign out
          </button>
        </form>
      </header>
      <div className="p-6">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/(app)/layout.tsx"
git commit -m "feat: add app layout with session guard and sign-out toolbar"
```

---

## Task 7: Rate Cards List Page

**Files:**
- Create: `src/features/rate-cards/components/RateCardGrid.tsx`
- Create: `src/features/rate-cards/components/__tests__/RateCardGrid.test.tsx`
- Create: `src/app/[locale]/(app)/page.tsx`

- [ ] **Step 1: Write failing component tests**

```tsx
// src/features/rate-cards/components/__tests__/RateCardGrid.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RateCardGrid from '../RateCardGrid';
import type { RateCard } from '@/lib/database/schema';

type CardSummary = Pick<RateCard, 'code' | 'productName' | 'category' | 'status' | 'currency' | 'effectiveDate'>;

const mockCards: CardSummary[] = [
  { code: 'QSM', productName: 'Economy Standard', category: 'Air', status: 'Active', currency: 'VND', effectiveDate: '2026-04-01' },
  { code: 'YUN', productName: 'Economy Express', category: 'Air', status: 'Active', currency: 'VND', effectiveDate: null },
];

describe('RateCardGrid', () => {
  it('renders a card for each rate card', () => {
    render(<RateCardGrid cards={mockCards} />);
    expect(screen.getByText('Economy Standard')).toBeInTheDocument();
    expect(screen.getByText('Economy Express')).toBeInTheDocument();
  });

  it('renders the card code', () => {
    render(<RateCardGrid cards={mockCards} />);
    expect(screen.getByText('QSM')).toBeInTheDocument();
  });

  it('renders the status badge', () => {
    render(<RateCardGrid cards={mockCards} />);
    expect(screen.getAllByText('Active')).toHaveLength(2);
  });

  it('renders "—" when effectiveDate is null', () => {
    render(<RateCardGrid cards={mockCards} />);
    expect(screen.getByText(/Effective —/)).toBeInTheDocument();
  });

  it('renders links to the card detail page', () => {
    render(<RateCardGrid cards={mockCards} />);
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/cards/QSM');
    expect(links[1]).toHaveAttribute('href', '/cards/YUN');
  });

  it('renders empty state when cards array is empty', () => {
    render(<RateCardGrid cards={[]} />);
    expect(screen.getByText(/No rate cards/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/features/rate-cards/components/__tests__/RateCardGrid.test.tsx
```

Expected: FAIL — `Cannot find module '../RateCardGrid'`

- [ ] **Step 3: Implement RateCardGrid**

```tsx
// src/features/rate-cards/components/RateCardGrid.tsx
import Link from 'next/link';
import type { RateCard } from '@/lib/database/schema';

type CardSummary = Pick<RateCard, 'code' | 'productName' | 'category' | 'status' | 'currency' | 'effectiveDate'>;

interface RateCardGridProps {
  cards: CardSummary[];
}

export default function RateCardGrid({ cards }: RateCardGridProps) {
  if (cards.length === 0) {
    return <p className="text-sm text-gray-500">No rate cards available.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <Link
          key={c.code}
          href={`/cards/${c.code}`}
          className="block rounded-lg border p-4 transition-shadow hover:shadow"
        >
          <div className="flex justify-between">
            <span className="font-mono text-sm text-gray-500">{c.code}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
              {c.status}
            </span>
          </div>
          <h3 className="mt-1 font-medium">{c.productName}</h3>
          <p className="text-sm text-gray-500">{c.category}</p>
          <p className="mt-2 text-xs text-gray-400">
            Effective{' '}
            {c.effectiveDate
              ? new Date(c.effectiveDate).toLocaleDateString()
              : '—'}{' '}
            · {c.currency}
          </p>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/features/rate-cards/components/__tests__/RateCardGrid.test.tsx
```

Expected: 6/6 PASS.

- [ ] **Step 5: Create the list page**

```tsx
// src/app/[locale]/(app)/page.tsx
import RateCardGrid from '@/features/rate-cards/components/RateCardGrid';
import { listRateCards } from '@/lib/database/queries/rate-cards';

export default async function HomePage() {
  const cards = await listRateCards();
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Rate Cards</h2>
      <RateCardGrid cards={cards} />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/features/rate-cards/components/RateCardGrid.tsx "src/features/rate-cards/components/__tests__/RateCardGrid.test.tsx" "src/app/[locale]/(app)/page.tsx"
git commit -m "feat: add rate cards list page and RateCardGrid component"
```

---

## Task 8: Rate Card Detail Page

**Files:**
- Create: `src/features/rate-cards/components/RatesTable.tsx`
- Create: `src/features/rate-cards/components/__tests__/RatesTable.test.tsx`
- Create: `src/app/[locale]/(app)/cards/[code]/page.tsx`

- [ ] **Step 1: Write failing table tests**

```tsx
// src/features/rate-cards/components/__tests__/RatesTable.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RatesTable from '../RatesTable';
import type { Rate } from '@/lib/database/schema';

type RateSummary = Pick<Rate, 'destination' | 'zoneCode' | 'weightKg' | 'unit' | 'price'>;

const mockRates: RateSummary[] = [
  { destination: 'USA',    zoneCode: 'Z1', weightKg: '1.00', unit: 'kg', price: '150000' },
  { destination: 'France', zoneCode: null, weightKg: '0.50', unit: 'kg', price: null },
];

describe('RatesTable', () => {
  it('renders a row per rate entry', () => {
    render(<RatesTable rates={mockRates} currency="VND" />);
    expect(screen.getByText('USA')).toBeInTheDocument();
    expect(screen.getByText('France')).toBeInTheDocument();
  });

  it('formats price with locale number formatting', () => {
    render(<RatesTable rates={mockRates} currency="VND" />);
    expect(screen.getByText('150,000')).toBeInTheDocument();
  });

  it('renders "—" when price is null', () => {
    render(<RatesTable rates={mockRates} currency="VND" />);
    // At least one "—" from the null price
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the price column header with the supplied currency', () => {
    render(<RatesTable rates={mockRates} currency="VND" />);
    expect(screen.getByText('Price (VND)')).toBeInTheDocument();
  });

  it('renders empty state when rates array is empty', () => {
    render(<RatesTable rates={[]} currency="VND" />);
    expect(screen.getByText(/No rates/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/features/rate-cards/components/__tests__/RatesTable.test.tsx
```

Expected: FAIL — `Cannot find module '../RatesTable'`

- [ ] **Step 3: Implement RatesTable**

```tsx
// src/features/rate-cards/components/RatesTable.tsx
import type { Rate } from '@/lib/database/schema';

type RateSummary = Pick<Rate, 'destination' | 'zoneCode' | 'weightKg' | 'unit' | 'price'>;

interface RatesTableProps {
  rates: RateSummary[];
  currency: string;
}

function formatPrice(value: string | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat().format(Number(value));
}

export default function RatesTable({ rates, currency }: RatesTableProps) {
  if (rates.length === 0) {
    return <p className="text-sm text-gray-500">No rates available for this card.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="p-2 font-medium">Destination</th>
            <th className="p-2 font-medium">Zone</th>
            <th className="p-2 text-right font-medium">Weight (kg)</th>
            <th className="p-2 text-right font-medium">Price ({currency})</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="p-2">{r.destination}</td>
              <td className="p-2 text-gray-500">{r.zoneCode ?? '—'}</td>
              <td className="p-2 text-right">{Number(r.weightKg)}</td>
              <td className="p-2 text-right">{formatPrice(r.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/features/rate-cards/components/__tests__/RatesTable.test.tsx
```

Expected: 5/5 PASS.

- [ ] **Step 5: Create the detail page**

```tsx
// src/app/[locale]/(app)/cards/[code]/page.tsx
import { notFound } from 'next/navigation';
import RatesTable from '@/features/rate-cards/components/RatesTable';
import { getRateCard, getRates } from '@/lib/database/queries/rate-cards';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function CardPage({ params }: Props) {
  const { code } = await params;
  const [card, rates] = await Promise.all([getRateCard(code), getRates(code)]);
  if (!card) notFound();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{card.productName}</h1>
        <p className="text-sm text-gray-500">
          {card.code}
          {card.category ? ` · ${card.category}` : ''}
          {` · ${card.status}`}
          {` · ${card.currency}`}
        </p>
      </header>
      <RatesTable rates={rates} currency={card.currency ?? 'VND'} />
    </div>
  );
}
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/rate-cards/components/RatesTable.tsx "src/features/rate-cards/components/__tests__/RatesTable.test.tsx" "src/app/[locale]/(app)/cards/[code]/page.tsx"
git commit -m "feat: add rate card detail page and RatesTable component"
```

---

## Task 9: Full Test Suite + E2E Smoke Test

**Files:**
- Create: `src/test/e2e/rate-cards.spec.ts`

- [ ] **Step 1: Run the full unit test suite**

```bash
npx vitest run
```

Expected: all tests pass. Fix any failures before proceeding.

- [ ] **Step 2: Add E2E credentials to `.env.local`** (never commit)

```
E2E_TEST_EMAIL=your-supabase-user@infigroup.co
E2E_TEST_PASSWORD=yourpassword
```

Create the Supabase user first if you haven't: Supabase Dashboard → Authentication → Users → Add user.

- [ ] **Step 3: Write the E2E smoke test**

```ts
// src/test/e2e/rate-cards.spec.ts
import { test, expect } from '@playwright/test';

const EMAIL = process.env.E2E_TEST_EMAIL ?? '';
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? '';

test.describe('Rate Card Viewer', () => {
  test('unauthenticated requests redirect to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated access to /cards also redirects to /login', async ({ page }) => {
    await page.goto('/cards/NOTEXIST');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });

  test('login → see rate cards list → open detail → sign out', async ({ page }) => {
    // Login
    await page.goto('/en/login');
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    // Should land on the list
    await expect(page).toHaveURL(/\/(en\/)?$/);
    await expect(page.getByRole('heading', { name: /Rate Cards/i })).toBeVisible();

    // Click the first card
    const firstCard = page.locator('a[href*="/cards/"]').first();
    await expect(firstCard).toBeVisible();
    const cardHref = await firstCard.getAttribute('href');
    await firstCard.click();

    // Should be on detail page with a rates table
    await expect(page).toHaveURL(new RegExp(cardHref ?? '/cards/'));
    await expect(page.locator('table')).toBeVisible();

    // Sign out
    await page.click('button[type="submit"]:has-text("Sign out")');
    await expect(page).toHaveURL(/\/login/);
  });
});
```

- [ ] **Step 4: Start dev server and run E2E tests**

```bash
# Terminal 1
npm run dev

# Terminal 2
npx playwright test src/test/e2e/rate-cards.spec.ts --headed
```

Expected: 4/4 PASS. If any fail, check `playwright-report/` for screenshots and traces.

- [ ] **Step 5: Run lint**

```bash
npm run lint
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/test/e2e/rate-cards.spec.ts
git commit -m "test: add E2E smoke tests for rate card viewer"
```

---

## Self-Review

### Spec Coverage

| Requirement | Covered by |
|------------|-----------|
| Login — email + password, gated | Tasks 3, 4, 5, 6 |
| Rate cards list — grid by category | Tasks 2, 7 |
| Rate detail — full rates table | Tasks 2, 8 |
| Unauthenticated redirect to /login | Tasks 5 (middleware), 6 (layout) |
| Read-only — no write paths | By design — all RSCs, no mutations |
| Drizzle schema for rate_cards + rates | Task 1 |
| Supabase Auth (not NextAuth) | Tasks 3, 4, 5, 6 |
| Middleware session refresh | Task 5 |
| authGuard covers /cards/* | Task 5 |
| E2E smoke test | Task 9 |

### Type Consistency

- `RateCard`, `Rate` — defined Task 1, consumed in Tasks 2, 7, 8 ✓
- `CardSummary` (Pick of RateCard) — same shape in RateCardGrid component and its test ✓
- `RateSummary` (Pick of Rate) — same shape in RatesTable component and its test ✓
- `signIn(_prev: unknown, formData: FormData)` — matches `useActionState` first-argument signature ✓
- `createClient` import path `@/lib/auth/clients/server` — matches actual file location ✓
