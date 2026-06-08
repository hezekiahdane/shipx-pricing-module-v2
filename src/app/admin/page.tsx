import RateCardGrid from '@/features/rate-cards/components/RateCardGrid';
import {
  listRateCards,
  listTierThresholds,
} from '@/lib/database/queries/rate-cards';

export default async function AdminDashboard() {
  const [cards, tiers] = await Promise.all([
    listRateCards(),
    listTierThresholds(),
  ]);
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h2 className="text-lg font-semibold">Rate Cards</h2>
      <RateCardGrid cards={cards} tiers={tiers} />
    </div>
  );
}
