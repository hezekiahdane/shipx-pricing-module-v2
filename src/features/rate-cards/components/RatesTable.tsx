import type { Rate } from '@/lib/database/schema';

type RateSummary = Pick<
  Rate,
  'destination' | 'zoneCode' | 'weightKg' | 'unit' | 'price'
>;

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
    return (
      <p className="text-sm text-gray-500">No rates available for this card.</p>
    );
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
          {rates.map((r) => (
            <tr key={`${r.destination}-${r.weightKg}`} className="border-t">
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
