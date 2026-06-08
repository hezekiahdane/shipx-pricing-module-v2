'use client';
import { useRouter } from 'next/navigation';
import { Fragment } from 'react';
import type { RateCard, TierThreshold } from '@/lib/database/schema';

type CardSummary = Pick<
  RateCard,
  | 'code'
  | 'productName'
  | 'category'
  | 'status'
  | 'discountPublic'
  | 'discountTier1'
  | 'discountTier2'
  | 'discountTier3'
  | 'discountTier4'
  | 'discountTier5'
  | 'discountPt'
>;

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

interface RateCardGridProps {
  cards: CardSummary[];
  tiers: TierThreshold[];
}

// ─── Section grouping ──────────────────────────────────────────────────────

const SECTION_DEFS: { label: string; match: (c: CardSummary) => boolean }[] = [
  {
    label: 'ECONOMY — POSTAL',
    match: (c) =>
      c.category === 'Economy' && !c.productName.toUpperCase().includes('YUN'),
  },
  {
    label: 'ECONOMY — YUN (EXPERIMENT)',
    match: (c) =>
      c.category === 'Economy' && c.productName.toUpperCase().includes('YUN'),
  },
  { label: 'DIRECT US', match: (c) => c.category === 'Direct US' },
  { label: 'COMMERCIAL', match: (c) => c.category === 'Commercial' },
  {
    label: 'EXPRESS — DHL',
    match: (c) =>
      c.category === 'Express' && c.productName.toUpperCase().includes('DHL'),
  },
  {
    label: 'EXPRESS — FEDEX',
    match: (c) =>
      c.category === 'Express' && c.productName.toUpperCase().includes('FEDEX'),
  },
  {
    label: 'EXPRESS — UPS',
    match: (c) =>
      c.category === 'Express' && c.productName.toUpperCase().includes('UPS'),
  },
];

function groupCards(cards: CardSummary[]) {
  const matched = new Set<string>();
  const sections = SECTION_DEFS.map((def) => {
    const group = cards.filter((c) => def.match(c));
    for (const c of group) matched.add(c.code);
    return { label: def.label, cards: group };
  });
  const misc = cards.filter((c) => !matched.has(c.code));
  if (misc.length > 0) sections.push({ label: 'OTHER', cards: misc });
  return sections.filter((s) => s.cards.length > 0);
}

// ─── Formatting helpers ────────────────────────────────────────────────────

/**
 * Format a VND threshold value for display in a column header.
 * Finds the next tier to derive the "< X" label for the public tier.
 */
function fmtThreshold(tier: TierThreshold, allTiers: TierThreshold[]): string {
  if (!tier.thresholdMinVnd) {
    // Public tier: show "< [next tier]"
    const next = allTiers.find((t) => t.sortOrder === tier.sortOrder + 1);
    if (!next?.thresholdMinVnd) return '—';
    const m = Number(next.thresholdMinVnd) / 1_000_000;
    return `< ${m}M`;
  }
  const m = Number(tier.thresholdMinVnd) / 1_000_000;
  return `≥ ${m}M`;
}

function fmtDiscount(val: string | null | undefined): string {
  if (!val) return '—';
  const n = parseFloat(val);
  return Number.isNaN(n) ? '—' : `${n}%`;
}

function fmtName(name: string): string {
  return name.replace(/\s*·\s*/g, ' — ');
}

// ─── Status styles ─────────────────────────────────────────────────────────

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

// ─── Component ─────────────────────────────────────────────────────────────

export default function RateCardGrid({ cards, tiers }: RateCardGridProps) {
  const router = useRouter();

  if (cards.length === 0) {
    return <p className="text-sm text-gray-500">No rate cards available.</p>;
  }

  const sections = groupCards(cards);
  // +1 for the row-click column (no header cell), +4 for code/name/cat/status
  const colCount = 4 + tiers.length;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        {/* ── Column headers ── */}
        <thead>
          <tr className="bg-gray-900 text-white">
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">
              Code
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">
              Product Name
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">
              Category
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">
              Status
            </th>
            {tiers.map((t) => (
              <th
                key={t.tierKey}
                className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide"
              >
                {t.label}
              </th>
            ))}
          </tr>
        </thead>

        {/* ── Sections ── */}
        <tbody className="divide-y divide-gray-100 bg-white">
          {/* Revenue threshold row — sits above the first section */}
          <tr className="border-b bg-gray-50">
            <td
              colSpan={4}
              className="px-3 py-1.5 text-xs font-bold text-gray-400"
            >
              Tier Revenue Threshold (VND / month)
            </td>
            {tiers.map((t) => (
              <td
                key={t.tierKey}
                className="px-3 py-1.5 text-center text-xs text-gray-400"
              >
                {fmtThreshold(t, tiers)}
              </td>
            ))}
          </tr>

          {sections.map((section) => (
            <Fragment key={section.label}>
              <tr className="bg-gray-100">
                <td
                  colSpan={colCount}
                  className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  {section.label}
                </td>
              </tr>

              {section.cards.map((c) => {
                const rowBg = ROW_BG[c.status ?? ''] ?? '';
                const txtStyle = STATUS_TEXT[c.status ?? ''] ?? 'text-gray-500';

                return (
                  <tr
                    key={c.code}
                    onClick={() => router.push(`/admin/cards/${c.code}`)}
                    className={`cursor-pointer transition-colors hover:bg-gray-50 ${rowBg}`}
                  >
                    <td className="px-3 py-2.5 font-mono text-xs font-medium text-gray-500">
                      {c.code}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-gray-900">
                      {fmtName(c.productName)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-400">
                      {c.category}
                    </td>
                    <td className={`px-3 py-2.5 ${txtStyle}`}>{c.status}</td>
                    {tiers.map((t) => {
                      const col = TIER_KEY_TO_COLUMN[t.tierKey];
                      return (
                        <td
                          key={t.tierKey}
                          className="px-3 py-2.5 text-center tabular-nums text-gray-700"
                        >
                          {col ? fmtDiscount(c[col]) : 'PT'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
