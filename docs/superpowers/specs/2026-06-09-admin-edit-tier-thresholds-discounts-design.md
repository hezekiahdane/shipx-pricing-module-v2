# Design: Admin Edit — Tier Thresholds & Rate Card Discounts

**Date:** 2026-06-09  
**Status:** Approved  
**Scope:** Add inline editing for tier revenue thresholds and per-card tier discount percentages in the `/admin` rate card grid.

---

## Context

The `/admin` dashboard displays a read-only tier matrix — a table of rate cards with tier discount columns (Public, T1–T5, PT) and a revenue threshold header row. Both the threshold values and discount percentages are stored in the DB but currently cannot be edited from the UI.

Two editable targets:
- **`tier_thresholds`** — VND revenue band cutoffs (e.g. T1 ≥ 20M VND/month). One row per tier, global across all rate cards.
- **`rate_cards.discount_*`** — Per-card tier discount percentages (e.g. `discountTier1 = 1.50` → displayed as `1.5%`).

---

## Interaction Pattern

**Edit button per row (A).** Each rate card row gets a pencil icon (visible on hover). The threshold row has a pencil icon always visible. Clicking the pencil puts that row into inline edit mode — inputs appear in place of display values. Save (✓) and cancel (✗) appear in the row. All other rows remain read-only and navigable.

---

## Architecture

### New files

| Path | Purpose |
|------|---------|
| `src/lib/database/actions/rate-cards.ts` | Server actions: `updateRateCardDiscounts`, `updateTierThresholds` |
| `src/lib/validators/rate-cards.schema.ts` | Zod schemas for update payloads |
| `src/features/rate-cards/components/TierThresholdRow.tsx` | Editable threshold row (client component) |
| `src/features/rate-cards/components/CardRow.tsx` | Editable card row (client component) |

### Modified files

| Path | Change |
|------|--------|
| `src/features/rate-cards/components/RateCardGrid.tsx` | Delegates threshold row and card rows to new components; retains only thead + section grouping logic |

### Data flow

```
AdminDashboard (server)
  → fetches cards + tiers + codesWithRates
  → passes to RateCardGrid (client)
      → renders TierThresholdRow (client — owns edit state)
      → renders CardRow × N   (client — each owns its own edit state)

User clicks pencil
  → component enters edit mode
  → user edits values
  → save → server action → Zod parse → DB update → revalidatePath('/admin')
  → page re-renders with fresh DB data; component returns to read mode
```

Each editable component owns independent state — no cross-component coordination required.

---

## Component Specifications

### `TierThresholdRow`

Renders the "Tier Revenue Threshold" `<tr>`.

**State:**
- `editing: boolean`
- `draft: Record<tierKey, string>` — values in millions (e.g. `"20"` for 20 000 000 VND)
- `error: string | null`
- `saving: boolean`

**Behaviour:**
- Pencil icon always visible in the leftmost cell (not hover-gated — only one threshold row)
- Public tier cell is always read-only (threshold is derived, not stored; `thresholdMinVnd` is null)
- In edit mode: each non-public tier cell shows `<input type="number" min="0">` with the value displayed in millions; suffix `M VND` rendered beside each input
- On save: converts draft values back to VND (`value * 1_000_000`), validates ascending order client-side, calls `updateTierThresholds`
- Ascending validation failure shows error below the row; row stays in edit mode
- Server error shown inline below the row if action returns `{ error }`

### `CardRow`

Renders a single rate card `<tr>`.

**State:**
- `editing: boolean`
- `draft: Record<tierKey, string>` — initialised from current card props on edit entry
- `error: string | null`
- `saving: boolean`

**Behaviour:**
- Pencil icon visible on row hover, rendered at the far-right column
- `editing = true` suppresses row-click navigation (`router.push`)
- In edit mode: discount cells show `<input type="number" min="0" max="100" step="0.01">`, narrow (`w-16`), centered, blue focus ring
- PT tier is never editable (text label — not a numeric discount)
- All discount inputs are required; null is invalid (user cannot blank a cell)
- On save: calls `updateRateCardDiscounts(code, discounts)`
- Pencil replaced by ✓ (save, green) and ✗ (cancel, gray) during edit mode
- Both buttons disabled while `saving` is true; save button shows spinner
- Cancel immediately resets draft to original props and exits edit mode

### `RateCardGrid` (after refactor)

Responsibilities after delegating:
- Render `<thead>` with tier column headers
- Call `groupCards()` to produce sections
- Render `<TierThresholdRow tiers={tiers} />`
- Render section header rows
- Render `<CardRow card={c} tiers={tiers} codesWithRates={codesWithRates} />` per card

All edit state, input rendering, and action calls move out.

---

## Validation

### Zod schemas (`src/lib/validators/rate-cards.schema.ts`)

```ts
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

---

## Server Actions (`src/lib/database/actions/rate-cards.ts`)

```ts
'use server';

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
): Promise<{ error?: string }>;

export async function updateTierThresholds(
  updates: { tierKey: string; thresholdMinVnd: number }[],
): Promise<{ error?: string }>;
```

Both actions:
1. Parse input through Zod — return `{ error: string }` on validation failure (no throws)
2. Run Drizzle update against NeonDB
3. Call `revalidatePath('/admin')` on success
4. Return `{}` on success

Returning `{ error? }` instead of throwing avoids try/catch in the client components.

---

## UI Details

| Element | Spec |
|---------|------|
| Pencil icon | Lucide `Pencil`, 14px, `text-gray-400 hover:text-gray-600` |
| Discount input | `w-16 text-center tabular-nums rounded border border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-sm py-0.5` |
| Threshold input | Same as discount input but `w-20`; `M VND` suffix beside each |
| Save button | Lucide `Check`, 14px, `text-green-600 hover:text-green-700` |
| Cancel button | Lucide `X`, 14px, `text-gray-400 hover:text-gray-600` |
| Saving state | Save button replaced by `Loader2` spinner (Lucide), animated |
| Validation error | `<p className="text-xs text-red-500 mt-1">` below the row, spanning full width |
| Invalid input | `border-red-400` on blur if out of range |

---

## Constraints & Non-Goals

- **Auth:** Any logged-in admin can edit. No per-field role restriction.
- **Optimistic updates:** Not implemented. The table re-renders from DB after save.
- **Undo:** Not implemented. Cancel before save is the only rollback.
- **PT tier:** `discountPt` (text field) is never editable from this UI.
- **Public tier threshold:** Never editable (derived value, not stored).
- **Audit log:** Not in scope for this iteration.
- **Rate data editing:** Only discounts and thresholds — not the rates themselves.
