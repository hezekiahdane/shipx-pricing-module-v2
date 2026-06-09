# Plan: Admin Edit — Tier Thresholds & Rate Card Discounts

**Date:** 2026-06-09  
**Spec:** `docs/superpowers/specs/2026-06-09-admin-edit-tier-thresholds-discounts-design.md`  
**Branch:** `feat/admin-edit-discounts`  
**Worktree:** `.worktrees/feat-admin-edit-discounts`

## Context

The `/admin` dashboard at `src/app/admin/page.tsx` renders a `RateCardGrid` client component. The grid shows:
- A "Tier Revenue Threshold" row (read from `tier_thresholds` table)
- Rate card rows with discount columns per tier (read from `rate_cards` table)

Both are currently read-only. We're adding inline edit via pencil-icon-per-row, using Next.js Server Actions for persistence.

## Task Sequence

Tasks must run in order (each depends on the previous).

---

## Task 1 — Zod Schemas + Server Actions

**Files to create:**
- `src/lib/validators/rate-cards.schema.ts`
- `src/lib/database/actions/rate-cards.ts`

**Schemas (`src/lib/validators/rate-cards.schema.ts`):**

```ts
import { z } from 'zod';

export const discountUpdateSchema = z.object({
  code: z.string().min(1),
  discounts: z.object({
    discountPublic: z.number().min(0).max(100),
    discountTier1:  z.number().min(0).max(100),
    discountTier2:  z.number().min(0).max(100),
    discountTier3:  z.number().min(0).max(100),
    discountTier4:  z.number().min(0).max(100),
    discountTier5:  z.number().min(0).max(100),
  }),
});

export const thresholdUpdateSchema = z
  .array(
    z.object({
      tierKey: z.string().min(1),
      thresholdMinVnd: z.number().int().positive(),
    }),
  )
  .min(1)
  .superRefine((items, ctx) => {
    for (let i = 1; i < items.length; i++) {
      if (items[i].thresholdMinVnd <= items[i - 1].thresholdMinVnd) {
        ctx.addIssue({
          code: 'custom',
          message: 'Thresholds must be strictly ascending',
        });
      }
    }
  });
```

**Server actions (`src/lib/database/actions/rate-cards.ts`):**

Both actions must:
1. Parse input with Zod — return `{ error: string }` on failure (no throws)
2. Run DB update with Drizzle
3. Call `revalidatePath('/admin')` on success
4. Return `{}` on success

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/database';
import { rateCards, tierThresholds } from '@/lib/database/schema';
import { discountUpdateSchema, thresholdUpdateSchema } from '@/lib/validators/rate-cards.schema';

export async function updateRateCardDiscounts(
  code: string,
  discounts: {
    discountPublic: number;
    discountTier1: number;
    discountTier2: number;
    discountTier3: number;
    discountTier4: number;
    discountTier5: number;
  },
): Promise<{ error?: string }> { ... }

export async function updateTierThresholds(
  updates: { tierKey: string; thresholdMinVnd: number }[],
): Promise<{ error?: string }> { ... }
```

**Tests:** Write unit tests for the Zod schemas (valid inputs pass, invalid inputs return correct errors, ascending check works). Do NOT test the server actions directly against the DB — schema tests are sufficient for this task.

**Commit when done.**

---

## Task 2 — `TierThresholdRow` Component

**File to create:** `src/features/rate-cards/components/TierThresholdRow.tsx`

This component renders the "Tier Revenue Threshold" `<tr>` with inline edit capability.

**Props:**
```ts
interface TierThresholdRowProps {
  tiers: TierThreshold[];
  colSpanPrefix: number; // number of non-tier columns before the tier columns (currently 5)
}
```

**State:**
- `editing: boolean`
- `draft: Record<string, string>` — keyed by `tierKey`, values in millions (e.g. `"20"` for 20 000 000 VND)
- `error: string | null`
- `saving: boolean`

**Behaviour:**
- Edit button (Lucide `Pencil`, 14px) always visible in the leftmost cell — not hover-gated
- Public tier cell (`thresholdMinVnd === null`) is NEVER editable — always renders the derived `< X M` label as plain text
- In edit mode, non-public tier cells show `<input type="number" min="0">` displaying value in millions, with `M VND` suffix text beside each input
- Draft initialised from current tiers: `Number(tier.thresholdMinVnd) / 1_000_000` stringified
- On save: convert each draft value back to VND (`parseFloat(draft[key]) * 1_000_000`), call `updateTierThresholds`, handle `{ error }` return
- Client-side ascending check before calling action — show `error` below the row if invalid
- Save button shows Lucide `Loader2` spinner (animated) while `saving === true`; both buttons disabled during flight
- Cancel resets draft to original tiers and sets `editing = false`
- Error message: `<p className="text-xs text-red-500">` below the row spanning full width

**Input styling:**
- `w-20 text-center tabular-nums rounded border border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-sm py-0.5 px-1`
- On blur: if value is empty or NaN, add `border-red-400`

**Formatting helpers** — copy from `RateCardGrid`:
- `fmtThreshold(tier, allTiers)` — for read mode display

**Commit when done.**

---

## Task 3 — `CardRow` Component

**File to create:** `src/features/rate-cards/components/CardRow.tsx`

This component renders a single rate card `<tr>` with inline discount editing.

**Types needed (import from `RateCardGrid` or redeclare locally):**
```ts
type CardSummary = Pick<RateCard,
  'code' | 'productName' | 'category' | 'status' | 'source'
  | 'discountPublic' | 'discountTier1' | 'discountTier2'
  | 'discountTier3' | 'discountTier4' | 'discountTier5' | 'discountPt'
>;
```

**Props:**
```ts
interface CardRowProps {
  card: CardSummary;
  tiers: TierThreshold[];
  hasRates: boolean;
  onNavigate: (code: string) => void; // router.push delegated up
}
```

**State:**
- `editing: boolean`
- `draft: Record<string, string>` — keyed by tier column name (e.g. `'discountTier1'`), values as strings
- `error: string | null`
- `saving: boolean`

**Behaviour:**
- Pencil icon (Lucide `Pencil`, 14px, `text-gray-400`) visible on row hover — rendered in a new rightmost `<td>` (requires thead to also gain an empty header column — coordinate with Task 4)
- `editing = true`: suppresses row-click navigation; discount cells show `<input type="number" min="0" max="100" step="0.01">` narrow (`w-16`), centered, blue focus ring
- PT tier column (`t.tierKey === 'pt'`) is NEVER editable — renders `'PT'` plain text always
- All discount inputs are required; empty/NaN inputs get red border on blur; save button disabled if any input invalid
- Draft initialised from current card props on edit entry: `String(card.discountTier1 ?? '')` etc.
- On save: parse draft values to numbers, call `updateRateCardDiscounts(code, discounts)`, handle `{ error }` return
- Pencil replaced by ✓ (`Check`, green) and ✗ (`X`, gray) icon buttons during edit mode
- Both buttons disabled while `saving`; save button shows `Loader2` spinner
- Cancel: reset draft to original card props, `editing = false`
- `error` message: `<p className="text-xs text-red-500 col-span-full">` below the row — use a second `<tr>` spanning all columns

**Row styling** — preserve existing: `ROW_BG`, `STATUS_TEXT`, `cursor-pointer`, `hover:bg-gray-50`. Suppress click when `editing`.

**Formatting helpers** — copy from `RateCardGrid`:
- `fmtDiscount(val)` — for read mode display
- `fmtName(name)` — product name formatting

**Commit when done.**

---

## Task 4 — Refactor `RateCardGrid`

**File to modify:** `src/features/rate-cards/components/RateCardGrid.tsx`

Replace the inline threshold row and per-card row rendering with the new components. The grid should now be a thin orchestrator.

**Changes:**
1. Import `TierThresholdRow` and `CardRow`
2. Add an empty `<th>` header column at the end of `<thead>` for the pencil/action column (required by `CardRow`)
3. Replace the inline `<tr>` for thresholds with `<TierThresholdRow tiers={tiers} colSpanPrefix={5} />`
4. Replace the inline per-card `<tr>` blocks with `<CardRow card={c} tiers={tiers} hasRates={codesWithRates.has(c.code)} onNavigate={(code) => router.push(\`/admin/cards/\${code}\`)} />`
5. Remove `fmtThreshold`, `fmtDiscount`, `fmtName`, `STATUS_TEXT`, `ROW_BG`, `TIER_KEY_TO_COLUMN` from this file — they now live in the child components (or a shared util if both need them)
6. `colCount` calculation updated to `5 + tiers.length + 1` (extra column for actions)

**Verify:** After refactor, `npm test -- --run` must still pass with 179+ tests. Run the dev server and manually verify: grid renders, threshold row shows, clicking a card navigates, no console errors.

**Commit when done.**
