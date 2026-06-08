'use client';
import { useState } from 'react';
import type { Rate } from '@/lib/database/schema';

type RateSummary = Pick<
  Rate,
  'destination' | 'zoneCode' | 'weightKg' | 'unit' | 'price'
>;

type TransitInfo = { min: number | null; max: number | null };

interface RatesTableProps {
  rates: RateSummary[];
  currency: string;
  /** Zone → transit time. Keyed by both zone codes (C, S1) and destination names (USA, Germany). */
  transitByZone?: Record<string, TransitInfo>;
}

const PAGE_SIZE = 10;

function formatPrice(value: string | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat().format(Number(value));
}

function formatTransit(info: TransitInfo | undefined): string {
  if (!info) return '—';
  if (info.min !== null && info.max !== null)
    return `${info.min} – ${info.max} days`;
  return '—';
}

export default function RatesTable({
  rates,
  currency,
  transitByZone,
}: RatesTableProps) {
  const [page, setPage] = useState(0);

  if (rates.length === 0) {
    return (
      <p className="text-sm text-gray-500">No rates available for this card.</p>
    );
  }

  const totalPages = Math.ceil(rates.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const pageRows = rates.slice(start, start + PAGE_SIZE);
  const showTransit = !!transitByZone && Object.keys(transitByZone).length > 0;

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-2 font-medium text-gray-500">Destination</th>
              <th className="p-2 font-medium text-gray-500">Zone</th>
              <th className="p-2 text-right font-medium text-gray-500">
                Weight (kg)
              </th>
              <th className="p-2 text-right font-medium text-gray-500">
                Price ({currency})
              </th>
              {showTransit && (
                <th className="p-2 text-right font-medium text-gray-500">
                  Transit Time
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => {
              const transit = showTransit
                ? (transitByZone![r.zoneCode ?? ''] ??
                  transitByZone![r.destination])
                : undefined;
              return (
                <tr
                  key={`${r.destination}-${r.weightKg}`}
                  className="border-t hover:bg-gray-50"
                >
                  <td className="p-2">{r.destination}</td>
                  <td className="p-2 text-gray-500">{r.zoneCode ?? '—'}</td>
                  <td className="p-2 text-right tabular-nums">
                    {Number(r.weightKg)}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {formatPrice(r.price)}
                  </td>
                  {showTransit && (
                    <td className="p-2 text-right tabular-nums text-gray-600">
                      {formatTransit(transit)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {start + 1}–{Math.min(start + PAGE_SIZE, rates.length)} of{' '}
          {rates.length}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded border px-2 py-1 disabled:opacity-40 hover:bg-gray-100"
          >
            ← Prev
          </button>
          <span className="px-1 py-1">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="rounded border px-2 py-1 disabled:opacity-40 hover:bg-gray-100"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
