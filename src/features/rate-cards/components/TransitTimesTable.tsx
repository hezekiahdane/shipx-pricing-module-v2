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

function fmtTransit(entry: TransitEntry): string {
  if (entry.transitTimeMin !== null && entry.transitTimeMax !== null) {
    return `${entry.transitTimeMin} – ${entry.transitTimeMax} days`;
  }
  return entry.transitTimeRaw;
}

export default function TransitTimesTable({ entries }: TransitTimesTableProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500">No transit time data available.</p>
    );
  }

  return (
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
          {entries.map((e, i) => (
            <tr key={`${e.countryCode ?? i}`} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 text-gray-900">{e.countryName}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                {e.countryCode ?? '—'}
              </td>
              <td className="px-4 py-2.5 text-gray-500">{e.zoneCode ?? '—'}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                {fmtTransit(e)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
