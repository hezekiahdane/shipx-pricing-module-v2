'use client';
import { useRouter } from 'next/navigation';
import { Fragment } from 'react';
import type { RateCard } from '@/lib/database/schema';

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

interface RateCardGridProps {
  cards: CardSummary[];
}

// ─── Tier column definitions ───────────────────────────────────────────────

const TIERS: {
  key: keyof Pick<
    CardSummary,
    | 'discountPublic'
    | 'discountTier1'
    | 'discountTier2'
    | 'discountTier3'
    | 'discountTier4'
    | 'discountTier5'
  >;
  label: string;
  sub: string;
}[] = [
  { key: 'discountPublic', label: 'Public', sub: '< 20M' },
  { key: 'discountTier1', label: 'T1', sub: '≥ 20M' },
  { key: 'discountTier2', label: 'T2', sub: '≥ 30M' },
  { key: 'discountTier3', label: 'T3', sub: '≥ 40M' },
  { key: 'discountTier4', label: 'T4', sub: '≥ 70M' },
  { key: 'discountTier5', label: 'T5', sub: '≥ 120M' },
];

// Total column count (used for colSpan on section headers)
const COL_COUNT = 4 + TIERS.length + 1; // code+name+cat+status + tiers + PT

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

function fmtDiscount(val: string | null): string {
  if (!val) return '—';
  const n = parseFloat(val);
  return Number.isNaN(n) ? '—' : `${n}%`;
}

/** Replace the stored middle-dot separator with an em-dash for display. */
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

export default function RateCardGrid({ cards }: RateCardGridProps) {
  const router = useRouter();

  if (cards.length === 0) {
    return <p className="text-sm text-gray-500">No rate cards available.</p>;
  }

  const sections = groupCards(cards);

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
            {TIERS.map((t) => (
              <th
                key={t.key}
                className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide"
              >
                <div>{t.label}</div>
                <div className="font-normal text-gray-400 normal-case tracking-normal">
                  {t.sub}
                </div>
              </th>
            ))}
            <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide">
              PT
            </th>
          </tr>
        </thead>

        {/* ── Sections ── */}
        <tbody className="divide-y divide-gray-100 bg-white">
          {sections.map((section) => (
            <Fragment key={section.label}>
              {/* Section header row */}
              <tr className="bg-gray-100">
                <td
                  colSpan={COL_COUNT}
                  className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  {section.label}
                </td>
              </tr>

              {/* Card rows */}
              {section.cards.map((c) => {
                const rowBg = ROW_BG[c.status ?? ''] ?? '';
                const txtStyle = STATUS_TEXT[c.status ?? ''] ?? 'text-gray-500';

                return (
                  <tr
                    key={c.code}
                    onClick={() => router.push(`/cards/${c.code}`)}
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
                    {TIERS.map((t) => (
                      <td
                        key={t.key}
                        className="px-3 py-2.5 text-center tabular-nums text-gray-700"
                      >
                        {fmtDiscount(c[t.key])}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center text-xs text-gray-400">
                      PT
                    </td>
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
