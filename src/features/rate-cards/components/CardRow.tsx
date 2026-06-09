'use client';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import { Fragment, useState } from 'react';
import { updateRateCardDiscounts } from '@/lib/database/actions/rate-cards';
import type { RateCard, TierThreshold } from '@/lib/database/schema';

// ─── Types ─────────────────────────────────────────────────────────────────

type CardSummary = Pick<
  RateCard,
  | 'code'
  | 'productName'
  | 'category'
  | 'status'
  | 'source'
  | 'discountPublic'
  | 'discountTier1'
  | 'discountTier2'
  | 'discountTier3'
  | 'discountTier4'
  | 'discountTier5'
  | 'discountPt'
>;

export interface CardRowProps {
  card: CardSummary;
  tiers: TierThreshold[];
  hasRates: boolean;
  onNavigate: (code: string) => void;
}

// ─── Private constants ──────────────────────────────────────────────────────

// Maps a tier_key from the DB to the corresponding discount column on CardSummary.
// 'pt' has no discount column — it renders as a plain "PT" label.
const TIER_KEY_TO_COLUMN: Record<
  string,
  keyof Pick<
    CardSummary,
    | 'discountPublic'
    | 'discountTier1'
    | 'discountTier2'
    | 'discountTier3'
    | 'discountTier4'
    | 'discountTier5'
  >
> = {
  public: 'discountPublic',
  tier1: 'discountTier1',
  tier2: 'discountTier2',
  tier3: 'discountTier3',
  tier4: 'discountTier4',
  tier5: 'discountTier5',
};

const STATUS_TEXT: Record<string, string> = {
  Active: 'text-green-700 font-semibold',
  Experiment: 'text-amber-600 font-semibold',
  'Pre-launch': 'text-blue-600 font-semibold',
  'Not Live': 'text-gray-400',
  'Under Review': 'text-red-600 font-semibold',
};

const ROW_BG: Record<string, string> = {
  'Under Review': 'bg-red-50',
  Experiment: 'bg-amber-50/30',
};

// ─── Formatting helpers ─────────────────────────────────────────────────────

function fmtDiscount(val: string | null | undefined): string {
  if (!val) return '—';
  const n = parseFloat(val);
  return Number.isNaN(n) ? '—' : `${n}%`;
}

function fmtName(name: string): string {
  return name.replace(/\s*·\s*/g, ' — ');
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CardRow({
  card,
  tiers,
  hasRates,
  onNavigate,
}: CardRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const rowBg = ROW_BG[card.status ?? ''] ?? '';
  const txtStyle = STATUS_TEXT[card.status ?? ''] ?? 'text-gray-500';

  function enterEdit() {
    const initialDraft: Record<string, string> = {};
    for (const t of tiers) {
      const col = TIER_KEY_TO_COLUMN[t.tierKey];
      if (col) initialDraft[col] = String(card[col] ?? '');
    }
    setDraft(initialDraft);
    setEditing(true);
  }

  function handleCancel() {
    setDraft({});
    setError(null);
    setEditing(false);
  }

  async function handleSave() {
    const discounts = {
      discountPublic: parseFloat(draft.discountPublic ?? ''),
      discountTier1: parseFloat(draft.discountTier1 ?? ''),
      discountTier2: parseFloat(draft.discountTier2 ?? ''),
      discountTier3: parseFloat(draft.discountTier3 ?? ''),
      discountTier4: parseFloat(draft.discountTier4 ?? ''),
      discountTier5: parseFloat(draft.discountTier5 ?? ''),
    };

    const values = Object.values(discounts);
    if (values.some((v) => Number.isNaN(v) || v < 0 || v > 100)) {
      setError('All discount values must be numbers between 0 and 100.');
      return;
    }

    setSaving(true);
    setError(null);
    const result = await updateRateCardDiscounts(card.code, discounts);
    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      setEditing(false);
    }
  }

  return (
    <Fragment>
      <tr
        onClick={editing ? undefined : () => onNavigate(card.code)}
        className={`group cursor-pointer transition-colors hover:bg-gray-50 ${rowBg}`}
      >
        {/* Code cell */}
        <td className="px-3 py-2.5 font-mono text-xs font-medium text-gray-500">
          <div className="flex flex-col gap-0.5">
            {card.code}
            {!hasRates && (
              <span className="inline-block w-fit rounded bg-gray-100 px-1 py-0.5 text-[10px] font-normal text-gray-400">
                no rates
              </span>
            )}
          </div>
        </td>

        {/* Product name */}
        <td className="px-3 py-2.5 font-medium text-gray-900">
          {fmtName(card.productName)}
        </td>

        {/* Category */}
        <td className="px-3 py-2.5 text-xs text-gray-400">{card.category}</td>

        {/* Status */}
        <td className={`px-3 py-2.5 ${txtStyle}`}>{card.status}</td>

        {/* Source */}
        <td className="px-3 py-2.5 text-center">
          <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-xs text-gray-600">
            {card.source}
          </span>
        </td>

        {/* Tier discount cells */}
        {tiers.map((t) => {
          const col = TIER_KEY_TO_COLUMN[t.tierKey];
          return (
            <td
              key={t.tierKey}
              className="px-3 py-2.5 text-center tabular-nums text-gray-700"
            >
              {col ? (
                editing ? (
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={draft[col] ?? ''}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [col]: e.target.value }))
                    }
                    className="w-16 rounded border border-gray-300 px-1 py-0.5 text-center text-sm tabular-nums focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  fmtDiscount(card[col])
                )
              ) : (
                'PT'
              )}
            </td>
          );
        })}

        {/* Action column */}
        <td className="px-2 py-2.5 text-center">
          {editing ? (
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                aria-label="Save"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin text-green-600" />
                ) : (
                  <Check size={14} className="text-green-600" />
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                aria-label="Cancel"
              >
                <X size={14} className="text-gray-400" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                enterEdit();
              }}
              className="opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Edit discounts"
            >
              <Pencil size={14} className="text-gray-400" />
            </button>
          )}
        </td>
      </tr>

      {error && (
        <tr>
          <td colSpan={5 + tiers.length + 1} className="px-3 pb-1.5">
            <p className="text-xs text-red-500">{error}</p>
          </td>
        </tr>
      )}
    </Fragment>
  );
}
