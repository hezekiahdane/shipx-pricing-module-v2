'use client';
import { useState } from 'react';
import type { TransitTime } from '@/lib/database/schema';

type TransitEntry = Pick<
  TransitTime,
  | 'countryName'
  | 'countryCode'
  | 'zoneCode'
  | 'transitTimeMin'
  | 'transitTimeMax'
  | 'transitTimeRaw'
>;

interface TransitTimesTableProps {
  entries: TransitEntry[];
}

const PAGE_SIZE = 10;

function fmtTransit(entry: TransitEntry): string {
  if (entry.transitTimeMin !== null && entry.transitTimeMax !== null) {
    return `${entry.transitTimeMin} – ${entry.transitTimeMax} days`;
  }
  return entry.transitTimeRaw;
}

export default function TransitTimesTable({ entries }: TransitTimesTableProps) {
  const [page, setPage] = useState(0);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500">No transit time data available.</p>
    );
  }

  const totalPages = Math.ceil(entries.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const pageRows = entries.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium text-gray-500">Country</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">Code</th>
              <th className="px-4 py-2.5 font-medium text-gray-500">Zone</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-500">
                Transit Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.map((e, i) => (
              <tr
                key={`${e.countryCode ?? i}-${start}`}
                className="hover:bg-gray-50"
              >
                <td className="px-4 py-2.5 text-gray-900">{e.countryName}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                  {e.countryCode ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-gray-500">
                  {e.zoneCode ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                  {fmtTransit(e)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {start + 1}–{Math.min(start + PAGE_SIZE, entries.length)} of{' '}
          {entries.length}
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
