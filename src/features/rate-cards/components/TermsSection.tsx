import type { RateCardTerm } from '@/lib/database/schema';

type Term = Pick<RateCardTerm, 'sectionNum' | 'title' | 'body'>;

interface TermsSectionProps {
  terms: Term[];
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
          <div className="space-y-1">
            {t.body.split('\n').map((line, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: paragraph order within a term body is stable
              <p key={i} className="text-sm text-gray-600 leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}
