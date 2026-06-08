import { notFound } from 'next/navigation';
import RatesTable from '@/features/rate-cards/components/RatesTable';
import { getRateCard, getRates } from '@/lib/database/queries/rate-cards';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function CardPage({ params }: Props) {
  const { code } = await params;
  const [card, rates] = await Promise.all([getRateCard(code), getRates(code)]);
  if (!card) notFound();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{card.productName}</h1>
        <p className="text-sm text-gray-500">
          {card.code}
          {card.category ? ` · ${card.category}` : ''}
          {` · ${card.status}`}
          {` · ${card.currency}`}
        </p>
      </header>
      <RatesTable rates={rates} currency={card.currency ?? 'VND'} />
    </div>
  );
}
