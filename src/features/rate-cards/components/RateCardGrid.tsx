'use client';
import { useRouter } from 'next/navigation';
import { Fragment } from 'react';
import type { RateCard, TierThreshold } from '@/lib/database/schema';
import CardRow from './CardRow';
import TierThresholdRow from './TierThresholdRow';

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

interface RateCardGridProps {
  cards: CardSummary[];
  tiers: TierThreshold[];
  codesWithRates: Set<string>;
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

// ─── Component ─────────────────────────────────────────────────────────────

export default function RateCardGrid({
  cards,
  tiers,
  codesWithRates,
}: RateCardGridProps) {
  const router = useRouter();

  if (cards.length === 0) {
    return <p className="text-sm text-gray-500">No rate cards available.</p>;
  }

  const sections = groupCards(cards);
  // code + name + category + status + source + tiers + action column
  const colCount = 5 + tiers.length + 1;

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
            <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide">
              Source
            </th>
            {tiers.map((t) => (
              <th
                key={t.tierKey}
                className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide"
              >
                {t.label}
              </th>
            ))}
            <th className="px-2 py-3" /> {/* action column */}
          </tr>
        </thead>

        {/* ── Sections ── */}
        <tbody className="divide-y divide-gray-100 bg-white">
          {/* Revenue threshold row — sits above the first section */}
          <TierThresholdRow tiers={tiers} colSpanPrefix={5} />

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

              {section.cards.map((c) => (
                <CardRow
                  key={c.code}
                  card={c}
                  tiers={tiers}
                  hasRates={codesWithRates.has(c.code)}
                  onNavigate={(code) => router.push(`/admin/cards/${code}`)}
                />
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
