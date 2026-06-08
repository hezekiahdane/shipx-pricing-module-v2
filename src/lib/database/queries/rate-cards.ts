import { asc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/database';
import type { Rate, RateCard } from '@/lib/database/schema';
import { rateCards, rates } from '@/lib/database/schema';

export async function listRateCards(): Promise<
  Pick<
    RateCard,
    | 'code'
    | 'productName'
    | 'category'
    | 'status'
    | 'discountPublic'
    | 'discountTier1'
    | 'discountTier2'
    | 'discountTier3'
    | 'discountTier4'
    | 'discountTier5'
    | 'discountPt'
  >[]
> {
  const db = getDb();
  return db
    .select({
      code: rateCards.code,
      productName: rateCards.productName,
      category: rateCards.category,
      status: rateCards.status,
      discountPublic: rateCards.discountPublic,
      discountTier1: rateCards.discountTier1,
      discountTier2: rateCards.discountTier2,
      discountTier3: rateCards.discountTier3,
      discountTier4: rateCards.discountTier4,
      discountTier5: rateCards.discountTier5,
      discountPt: rateCards.discountPt,
    })
    .from(rateCards)
    .orderBy(sql`${rateCards.category} NULLS LAST`, asc(rateCards.code));
}

export async function getRateCard(code: string): Promise<RateCard | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(rateCards)
    .where(eq(rateCards.code, code));
  return rows[0] ?? null;
}

export async function getRates(
  cardCode: string,
): Promise<
  Pick<Rate, 'destination' | 'zoneCode' | 'weightKg' | 'unit' | 'price'>[]
> {
  const db = getDb();
  return db
    .select({
      destination: rates.destination,
      zoneCode: rates.zoneCode,
      weightKg: rates.weightKg,
      unit: rates.unit,
      price: rates.price,
    })
    .from(rates)
    .where(eq(rates.cardCode, cardCode))
    .orderBy(asc(rates.weightKg), asc(rates.destination));
}
