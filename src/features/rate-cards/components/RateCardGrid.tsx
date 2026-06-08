import Link from 'next/link';
import type { RateCard } from '@/lib/database/schema';

type CardSummary = Pick<
  RateCard,
  'code' | 'productName' | 'category' | 'status' | 'currency' | 'effectiveDate'
>;

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
