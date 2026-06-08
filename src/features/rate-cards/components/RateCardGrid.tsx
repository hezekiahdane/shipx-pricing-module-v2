import Link from 'next/link';
import type { RateCard } from '@/lib/database/schema';

type CardSummary = Pick<
  RateCard,
  'code' | 'productName' | 'category' | 'status' | 'currency' | 'effectiveDate'
>;

interface RateCardGridProps {
  cards: CardSummary[];
}

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-green-50 text-green-700 ring-green-600/20',
  Experiment: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  'Pre-launch': 'bg-blue-50 text-blue-700 ring-blue-600/20',
  Inactive: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

export default function RateCardGrid({ cards }: RateCardGridProps) {
  if (cards.length === 0) {
    return <p className="text-sm text-gray-500">No rate cards available.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              Code
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              Product Name
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              Category
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              Status
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              Effective Date
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">
              Currency
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {cards.map((c) => {
            const statusStyle =
              STATUS_STYLES[c.status ?? ''] ??
              'bg-gray-100 text-gray-600 ring-gray-500/20';
            return (
              <tr key={c.code} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {c.code}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {c.productName}
                </td>
                <td className="px-4 py-3 text-gray-500">{c.category ?? '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyle}`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {c.effectiveDate
                    ? new Date(c.effectiveDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">{c.currency}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/cards/${c.code}`}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    View rates →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
