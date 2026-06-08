import { notFound } from 'next/navigation';
import RatesTable from '@/features/rate-cards/components/RatesTable';
import TermsSection from '@/features/rate-cards/components/TermsSection';
import {
  getRateCard,
  getRates,
  getTerms,
  getTransitTimesByZone,
} from '@/lib/database/queries/rate-cards';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function CardPage({ params }: Props) {
  const { code } = await params;
  const card = await getRateCard(code);
  if (!card) notFound();

  const [rates, transitByZone, terms] = await Promise.all([
    getRates(code),
    getTransitTimesByZone(code),
    getTerms(code),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{card.productName}</h1>
        <p className="text-sm text-gray-500">
          {card.code}
          {card.category ? ` · ${card.category}` : ''}
          {` · ${card.status}`}
          {` · ${card.currency}`}
        </p>
      </header>

      <RatesTable
        rates={rates}
        currency={card.currency ?? 'VND'}
        transitByZone={transitByZone}
      />

      {terms.length > 0 && (
        <section className="space-y-3 rounded-lg border p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Terms &amp; Conditions
          </h2>
          <TermsSection terms={terms} />
        </section>
      )}
    </div>
  );
}
