# Rate Card Viewer — Build Spec

A simple internal tool to log in, browse rate cards, and view the flattened
rates for any selected card.

---

## 1. Scope

In scope for this build:

1. **Login** — email + password, gated access to everything.
2. **Rate cards list** — all cards shown as a grid of cards (or a table), grouped by category.
3. **Rate detail** — selecting a card shows its full rates table.

Out of scope (handled elsewhere / later): the CSV ingestion pipeline, editing
rates in the UI, and per-country resolution. Data is loaded into the database
separately; this app is read-only.

---

## 2. Tech Stack

Everything runs on the **base system** — no new packages needed.

| Concern | Base system tool |
|---------|-----------------|
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| Database | PostgreSQL via **Drizzle ORM** (`getDb()` from `@/lib/database`) |
| Auth | **Supabase Auth** (`@/lib/auth`) — Credentials flow (email + password) |
| Styling | Tailwind CSS + **shadcn/ui** components |
| Validation | **Zod** + `withApi` wrapper for any API routes |
| i18n | next-intl — all pages live under `src/app/[locale]/` |

No new `npm install` required. The base system already ships all of these.

> **Users** are managed in Supabase (dashboard or admin API) — no local `users`
> table or bcrypt hashing needed. Supabase handles password storage and
> verification internally.

---

## 3. Environment Variables

Add to `.env.local` (copy from `.env.example`):

```bash
# ─── Required (already in base .env.example) ─────────────────────
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME="ShipX Pricing"

# ─── Auth (Supabase) ─────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # only needed for admin ops

# ─── Database (Drizzle ORM) ───────────────────────────────────────
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
DATABASE_URL_DIRECT=postgresql://user:pass@host:5432/db?sslmode=require
```

Also add the new env var keys to `src/lib/core/env.ts` if they are not already
present (Supabase keys should already be in the optional section; DATABASE_URL
should also be there).

---

## 4. Database Schema

Add to `src/lib/database/schema/index.ts` — Drizzle definitions for the two
data tables. No `users` table; Supabase Auth owns that.

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

// Catalog: one row per rate card
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

// Flattened rates: one row per card × destination × weight bracket
export const rates = pgTable(
  'rates',
  {
    id:          bigserial('id', { mode: 'number' }).primaryKey(),
    cardCode:    text('card_code')
                   .notNull()
                   .references(() => rateCards.code, { onDelete: 'cascade' }),
    destination: text('destination').notNull(),  // verbatim column label: "USA", "EU I", etc.
    zoneCode:    text('zone_code'),               // nullable — some cards omit it
    weightKg:    numeric('weight_kg').notNull(),  // bracket upper bound
    unit:        text('unit').default('kg'),      // 'kg' | 'cbm'
    price:       numeric('price'),               // NULL = not offered at this weight
  },
  (t) => [
    index('idx_rates_lookup').on(t.cardCode, t.destination, t.weightKg),
    unique().on(t.cardCode, t.destination, t.weightKg),
  ],
);

export type RateCard = typeof rateCards.$inferSelect;
export type Rate = typeof rates.$inferSelect;
```

Generate and apply the migration:

```bash
npm run db:generate   # creates migration file in src/lib/database/migrations/
npm run db:migrate    # applies it to the database
```

Seed rate card data directly via SQL or the ingestion pipeline — no seeding
script is needed for auth since users are created in Supabase dashboard.

> To create the first login: go to your Supabase project → Authentication →
> Users → Invite user. Set their password via "Send magic link" or the admin
> API. No bcrypt, no SQL `INSERT` needed.

---

## 5. Project Structure

```
src/
├── app/
│   └── [locale]/
│       ├── login/
│       │   └── page.tsx                  login form (public)
│       └── (app)/
│           ├── layout.tsx                session guard + top nav + sign-out
│           ├── page.tsx                  rate cards list (home)
│           └── cards/
│               └── [code]/
│                   └── page.tsx          rates table for one card
│
├── features/
│   ├── auth/
│   │   ├── actions.ts                    signIn / signOut server actions
│   │   └── components/
│   │       └── LoginForm.tsx             'use client' login form component
│   └── rate-cards/
│       └── components/
│           ├── RateCardGrid.tsx          cards list UI
│           ├── RateCardDetail.tsx        card header + metadata
│           └── RatesTable.tsx            rates data table
│
├── lib/
│   ├── auth/                             (existing — no changes)
│   │   ├── clients/browser.ts
│   │   ├── clients/server.ts             ← createClient() used in server actions
│   │   ├── clients/middleware.ts         ← createMiddlewareClient() for session refresh
│   │   └── guard.ts                      ← authGuard() — add '/(app)' to PROTECTED_ROUTES
│   └── database/
│       ├── schema/index.ts               ← add rateCards + rates tables
│       └── queries/
│           └── rate-cards.ts             ← listRateCards, getRateCard, getRates
│
└── middleware.ts                         ← add Supabase session refresh
```

---

## 6. Auth

### 6.1 — Update `middleware.ts`

Add Supabase session refresh (required for SSR auth to work) and wire the
existing `authGuard`. The i18n + CSP flow is unchanged.

```ts
import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';
import { buildCspHeader, generateCspNonce } from './src/lib/core/security/csp';
import { createMiddlewareClient } from './src/lib/auth/clients/middleware';
import { authGuard } from './src/lib/auth/guard';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return NextResponse.rewrite(new URL('/maintenance', request.url));
  }

  const isDev =
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';

  const nonce = generateCspNonce();
  const csp = buildCspHeader(nonce);

  // --- dev panel blocked-pages simulation (unchanged) ---
  if (isDev) {
    // ... keep existing dev panel block logic unchanged ...
  }

  // Refresh Supabase session on every request — must run before auth guard.
  let response = NextResponse.next({ request });
  const supabase = createMiddlewareClient(request, response);
  const { data: { session } } = await supabase.auth.getSession();

  // Redirect unauthenticated users away from protected routes.
  response = authGuard(request, response, !!session);

  // Apply i18n locale routing.
  const intlResponse = intlMiddleware(request);

  // If intlMiddleware issued a redirect/rewrite, honour it but carry CSP.
  if (intlResponse.status !== 200) {
    intlResponse.headers.set('Content-Security-Policy', csp);
    intlResponse.headers.set('x-nonce', nonce);
    return intlResponse;
  }

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('x-nonce', nonce);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

### 6.2 — Update `src/lib/auth/guard.ts`

Add the app route group to the protected list:

```ts
const PROTECTED_ROUTES = ['/dashboard', '/settings', '/admin', '/(app)', '/cards'];
```

> The guard strips the locale prefix before matching, so `/en/(app)` correctly
> matches `/(app)`.

### 6.3 — `src/features/auth/actions.ts`

```ts
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

### 6.4 — `src/features/auth/components/LoginForm.tsx`

```tsx
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
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
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

### 6.5 — `src/app/[locale]/login/page.tsx`

```tsx
import LoginForm from '@/features/auth/components/LoginForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoginForm />
    </div>
  );
}
```

---

## 7. Data Access

### `src/lib/database/queries/rate-cards.ts`

```ts
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

---

## 8. Pages

### `src/app/[locale]/(app)/layout.tsx` — session guard + shell

```tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/auth/clients/server';
import { signOut } from '@/features/auth/actions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  return (
    <div>
      <nav className="flex items-center justify-between border-b p-4">
        <Link href="/" className="font-semibold">Rate Cards</Link>
        <form action={signOut}>
          <button type="submit" className="text-sm text-gray-600">Sign out</button>
        </form>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

### `src/app/[locale]/(app)/page.tsx` — rate cards list

Grid of cards grouped by category; each links to its detail page. Show
`code`, `productName`, a status badge, and `effectiveDate`.

```tsx
import Link from 'next/link';
import { listRateCards } from '@/lib/database/queries/rate-cards';

export default async function HomePage() {
  const cards = await listRateCards();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <Link
          key={c.code}
          href={`/cards/${c.code}`}
          className="block rounded-lg border p-4 hover:shadow"
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

### `src/app/[locale]/(app)/cards/[code]/page.tsx` — rates for a card

Header with card metadata, then the rates table. The flat layout
(`destination | zone | weight | price`) is the simplest correct view.
To show the original spreadsheet look (weights as rows, destinations as
columns), pivot in the component — keep storage flat, pivot only at render.

```tsx
import { notFound } from 'next/navigation';
import { getRateCard, getRates } from '@/lib/database/queries/rate-cards';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function CardPage({ params }: Props) {
  const { code } = await params;
  const [card, rates] = await Promise.all([getRateCard(code), getRates(code)]);
  if (!card) notFound();

  const fmt = (n: string | null) =>
    n == null ? '—' : new Intl.NumberFormat().format(Number(n));

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">{card.productName}</h1>
        <p className="text-gray-500">
          {card.code} · {card.category} · {card.status} · {card.currency}
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-2">Destination</th>
              <th className="p-2">Zone</th>
              <th className="p-2 text-right">Weight (kg)</th>
              <th className="p-2 text-right">Price ({card.currency})</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{r.destination}</td>
                <td className="p-2 text-gray-500">{r.zoneCode ?? '—'}</td>
                <td className="p-2 text-right">{Number(r.weightKg)}</td>
                <td className="p-2 text-right">{fmt(r.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 9. Build Order

1. **Supabase project** — create project; grab `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
2. **PostgreSQL / Drizzle** — fill in `DATABASE_URL` + `DATABASE_URL_DIRECT`.
3. **Schema** — add `rateCards` + `rates` to `src/lib/database/schema/index.ts`.
   Run `npm run db:generate && npm run db:migrate`.
4. **Seed** — load `rate_cards` + `rates` rows from the CSV ingestion step or a
   manual SQL load.
5. **Create first user** — Supabase dashboard → Authentication → Users → Invite.
6. **Auth wiring** — add server actions (`src/features/auth/actions.ts`),
   `LoginForm` component, and `login` page.
7. **Middleware** — update `middleware.ts` to add Supabase session refresh and
   wire `authGuard`. Update `authGuard` protected routes.
8. **Queries** — add `src/lib/database/queries/rate-cards.ts`.
9. **Pages** — build `(app)/layout.tsx`, `(app)/page.tsx`,
   `(app)/cards/[code]/page.tsx`.
10. **Verify** — unauthenticated requests redirect to `/login`; after sign-in
    the list and detail pages load with real data; sign-out lands back on login.

---

## 10. Notes / Next Steps

- **Auth simplicity:** Supabase Credentials flow is the lightest real login for
  an internal tool. If only one shared account is ever needed, a single Supabase
  user is sufficient — no role management required.
- **No `users` table:** auth users live entirely in Supabase's `auth.users` table.
  Add a `user_profiles` table later only if app-specific user data is needed.
- **Read-only by design:** no write paths are exposed; a leaked session cannot
  modify data. Ingestion stays a separate, access-controlled process.
- **Versioning:** if historical pricing is needed later, add `effective_date` to
  the `rates` primary key. The detail page can then offer a version selector
  without a schema rewrite.
- **Pivot view:** the flat table is the shipping default. To render the original
  spreadsheet layout (weight rows × destination columns), collect distinct
  `destination` values as columns and distinct `weightKg` as rows inside the
  Server Component — no extra query or storage change needed.
- **shadcn/ui:** replace the bare `<table>` and `<Link>` cards with shadcn
  `<Table>` and `<Card>` components once the data wiring is confirmed working.
