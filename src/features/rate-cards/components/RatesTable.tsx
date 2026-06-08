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
  /** Zone → transit time. Keyed by zone codes (C, S1) and destination names (USA, Germany). */
  transitByZone?: Record<string, TransitInfo>;
}

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(value: string | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat().format(Number(value));
}

function formatTransit(info: TransitInfo | undefined): string {
  if (!info || (info.min === null && info.max === null)) return '—';
  return `${info.min}–${info.max}d`;
}

// Build pivot data: unique sorted weights as rows, unique destinations as columns.
function buildPivot(rates: RateSummary[]) {
  const destOrder: string[] = [];
  const seenDest = new Set<string>();
  const weightOrder: string[] = [];
  const seenWeight = new Set<string>();

  for (const r of rates) {
    if (!seenDest.has(r.destination)) {
      seenDest.add(r.destination);
      destOrder.push(r.destination);
    }
    if (!seenWeight.has(r.weightKg)) {
      seenWeight.add(r.weightKg);
      weightOrder.push(r.weightKg);
    }
  }

  weightOrder.sort((a, b) => Number(a) - Number(b));

  const zoneByDest: Record<string, string | null> = {};
  const lookup: Record<string, Record<string, string | null>> = {};

  for (const r of rates) {
    if (!zoneByDest[r.destination]) zoneByDest[r.destination] = r.zoneCode;
    if (!lookup[r.weightKg]) lookup[r.weightKg] = {};
    lookup[r.weightKg][r.destination] = r.price;
  }

  return { destinations: destOrder, weights: weightOrder, lookup, zoneByDest };
}

// ─── Pagination bar ────────────────────────────────────────────────────────────

function PaginationBar({
  page,
  totalPages,
  start,
  end,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  start: number;
  end: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between text-xs text-gray-500">
      <span>
        {start + 1}–{end} of {total}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrev}
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
          onClick={onNext}
          disabled={page === totalPages - 1}
          className="rounded border px-2 py-1 disabled:opacity-40 hover:bg-gray-100"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RatesTable({
  rates,
  currency,
  transitByZone,
}: RatesTableProps) {
  const [view, setView] = useState<'flat' | 'pivot'>('flat');
  const [page, setPage] = useState(0);

  if (rates.length === 0) {
    return (
      <p className="text-sm text-gray-500">No rates available for this card.</p>
    );
  }

  const showTransit = !!transitByZone && Object.keys(transitByZone).length > 0;

  // ── Toggle ──
  const toggle = (
    <div className="flex gap-1 rounded-md border p-0.5 w-fit">
      {(['flat', 'pivot'] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => {
            setView(v);
            setPage(0);
          }}
          className={`rounded px-3 py-1 text-xs font-medium transition-colors capitalize
            ${view === v ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          {v === 'flat' ? 'Flat' : 'Pivot'}
        </button>
      ))}
    </div>
  );

  // ── Flat view ──
  if (view === 'flat') {
    const totalPages = Math.ceil(rates.length / PAGE_SIZE);
    const start = page * PAGE_SIZE;
    const pageRows = rates.slice(start, start + PAGE_SIZE);

    return (
      <div className="space-y-2">
        {toggle}
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
        <PaginationBar
          page={page}
          totalPages={totalPages}
          start={start}
          end={Math.min(start + PAGE_SIZE, rates.length)}
          total={rates.length}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        />
      </div>
    );
  }

  // ── Pivot view ──
  const { destinations, weights, lookup, zoneByDest } = buildPivot(rates);
  const totalPages = Math.ceil(weights.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const pageWeights = weights.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-2">
      {toggle}
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            {/* Destination + transit time headers */}
            <tr>
              <th className="p-2 text-left font-medium text-gray-500 whitespace-nowrap">
                Weight (kg)
              </th>
              {destinations.map((dest) => {
                const zone = zoneByDest[dest];
                const transit = showTransit
                  ? (transitByZone![zone ?? ''] ?? transitByZone![dest])
                  : undefined;
                return (
                  <th
                    key={dest}
                    className="p-2 text-center font-medium text-gray-700 max-w-[100px]"
                    title={dest}
                  >
                    <div className="truncate text-xs">{dest}</div>
                    {showTransit && (
                      <div className="text-xs font-normal text-gray-400">
                        {formatTransit(transit)}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageWeights.map((wkg) => (
              <tr key={wkg} className="border-t hover:bg-gray-50">
                <td className="p-2 font-medium text-gray-700 whitespace-nowrap">
                  {Number(wkg)}
                </td>
                {destinations.map((dest) => (
                  <td
                    key={dest}
                    className="p-2 text-center tabular-nums text-gray-700"
                  >
                    {formatPrice(lookup[wkg]?.[dest] ?? null)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar
        page={page}
        totalPages={totalPages}
        start={start}
        end={Math.min(start + PAGE_SIZE, weights.length)}
        total={weights.length}
        onPrev={() => setPage((p) => Math.max(0, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
      />
    </div>
  );
}
