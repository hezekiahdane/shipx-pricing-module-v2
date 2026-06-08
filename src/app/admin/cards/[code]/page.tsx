import { notFound } from 'next/navigation';
import RatesTable from '@/features/rate-cards/components/RatesTable';
import TransitTimesTable from '@/features/rate-cards/components/TransitTimesTable';
import {
  getRateCard,
  getRates,
  getTransitTimes,
  getTransitTimesByZone,
} from '@/lib/database/queries/rate-cards';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function CardPage({ params }: Props) {
  const { code } = await params;
  const card = await getRateCard(code);
  if (!card) notFound();

  const [rates, transit, transitByZone] = await Promise.all([
    getRates(code),
    getTransitTimes(code),
    getTransitTimesByZone(code),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{card.productName}</h1>
        <p className="text-sm text-gray-500">
          {card.code}
          {card.category ? ` · ${card.category}` : ''}
          {` · ${card.status}`}
          {` · ${card.currency}`}
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Rates
        </h2>
        <RatesTable
          rates={rates}
          currency={card.currency ?? 'VND'}
          transitByZone={transitByZone}
        />
      </section>

      {transit.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Transit Times
          </h2>
          <TransitTimesTable entries={transit} />
        </section>
      )}
    </div>
  );
}
