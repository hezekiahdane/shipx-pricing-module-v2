import type { RateCardTerm } from '@/lib/database/schema';

type Term = Pick<RateCardTerm, 'sectionNum' | 'title' | 'body'>;

interface TermsSectionProps {
  terms: Term[];
}

function renderBody(body: string) {
  const lines = body.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.includes('\t')) {
      // Collect consecutive tab-separated lines into one table block
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].includes('\t')) {
        tableRows.push(lines[i].split('\t'));
        i++;
      }
      elements.push(
        <table
          key={`table-${i}`}
          className="mt-1 text-xs font-mono text-gray-600"
        >
          <tbody>
            {tableRows.map((cells, r) => (
              <tr
                key={cells[0] ?? r}
                className={r === 0 ? 'font-semibold text-gray-700' : ''}
              >
                {cells.map((cell, c) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: cell order within a table row is stable
                  <td key={c} className="pr-6 py-0.5">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
    } else {
      elements.push(
        // biome-ignore lint/suspicious/noArrayIndexKey: paragraph order within a term body is stable
        <p key={i} className="text-sm text-gray-600 leading-relaxed">
          {line}
        </p>,
      );
      i++;
    }
  }

  return elements;
}

export default function TermsSection({ terms }: TermsSectionProps) {
  if (terms.length === 0) return null;

  return (
    <ol className="space-y-4">
      {terms.map((t) => (
        <li key={t.sectionNum} className="space-y-1">
          <h3 className="text-sm font-semibold text-gray-800">
            {t.sectionNum}. {t.title}
          </h3>
          <div className="space-y-1">{renderBody(t.body)}</div>
        </li>
      ))}
    </ol>
  );
}
