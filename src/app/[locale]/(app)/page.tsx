import RateCardGrid from '@/features/rate-cards/components/RateCardGrid';
import { listRateCards } from '@/lib/database/queries/rate-cards';

export default async function HomePage() {
  const cards = await listRateCards();
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h2 className="text-lg font-semibold">Rate Cards</h2>
      <RateCardGrid cards={cards} />
    </div>
  );
}
