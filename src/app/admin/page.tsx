import RateCardGrid from '@/features/rate-cards/components/RateCardGrid';
import {
  listCardCodesWithRates,
  listRateCards,
  listTierThresholds,
} from '@/lib/database/queries/rate-cards';

export default async function AdminDashboard() {
  const [cards, tiers, codesWithRates] = await Promise.all([
    listRateCards(),
    listTierThresholds(),
    listCardCodesWithRates(),
  ]);
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h2 className="text-lg font-semibold">Rate Cards</h2>
      <RateCardGrid
        cards={cards}
        tiers={tiers}
        codesWithRates={codesWithRates}
      />
    </div>
  );
}
