import { asc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/database';
import type {
  Rate,
  RateCard,
  RateCardTerm,
  TierThreshold,
  TransitTime,
} from '@/lib/database/schema';
import {
  rateCards,
  rateCardTerms,
  rates,
  tierThresholds,
  transitTimes,
} from '@/lib/database/schema';

export async function listRateCards(): Promise<
  Pick<
    RateCard,
    | 'code'
    | 'productName'
    | 'category'
    | 'status'
    | 'source'
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
      source: rateCards.source,
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

export async function listTierThresholds(): Promise<TierThreshold[]> {
  const db = getDb();
  return db
    .select()
    .from(tierThresholds)
    .orderBy(asc(tierThresholds.sortOrder));
}

/**
 * Returns transit time info keyed by zone_code.
 * Zone codes in transit_times can be short codes (C, S1, ROW) or destination
 * names (USA, Germany) — both appear as keys in the returned record so
 * RatesTable can look up by either rates.zoneCode or rates.destination.
 */
export async function getTransitTimesByZone(
  cardCode: string,
): Promise<Record<string, { min: number | null; max: number | null }>> {
  const db = getDb();
  const rows = await db
    .select({
      zoneCode: transitTimes.zoneCode,
      transitTimeMin: transitTimes.transitTimeMin,
      transitTimeMax: transitTimes.transitTimeMax,
    })
    .from(transitTimes)
    .where(eq(transitTimes.cardCode, cardCode));

  const result: Record<string, { min: number | null; max: number | null }> = {};
  for (const row of rows) {
    if (!row.zoneCode) continue;
    const prev = result[row.zoneCode];
    if (!prev) {
      result[row.zoneCode] = {
        min: row.transitTimeMin,
        max: row.transitTimeMax,
      };
    } else {
      result[row.zoneCode] = {
        min:
          row.transitTimeMin !== null &&
          (prev.min === null || row.transitTimeMin < prev.min)
            ? row.transitTimeMin
            : prev.min,
        max:
          row.transitTimeMax !== null &&
          (prev.max === null || row.transitTimeMax > prev.max)
            ? row.transitTimeMax
            : prev.max,
      };
    }
  }
  return result;
}

export async function getTransitTimes(
  cardCode: string,
): Promise<
  Pick<
    TransitTime,
    | 'countryName'
    | 'countryCode'
    | 'zoneCode'
    | 'transitTimeMin'
    | 'transitTimeMax'
    | 'transitTimeRaw'
  >[]
> {
  const db = getDb();
  return db
    .select({
      countryName: transitTimes.countryName,
      countryCode: transitTimes.countryCode,
      zoneCode: transitTimes.zoneCode,
      transitTimeMin: transitTimes.transitTimeMin,
      transitTimeMax: transitTimes.transitTimeMax,
      transitTimeRaw: transitTimes.transitTimeRaw,
    })
    .from(transitTimes)
    .where(eq(transitTimes.cardCode, cardCode))
    .orderBy(asc(transitTimes.countryName));
}

export async function getTerms(
  cardCode: string,
): Promise<Pick<RateCardTerm, 'sectionNum' | 'title' | 'body'>[]> {
  const db = getDb();
  return db
    .select({
      sectionNum: rateCardTerms.sectionNum,
      title: rateCardTerms.title,
      body: rateCardTerms.body,
    })
    .from(rateCardTerms)
    .where(eq(rateCardTerms.cardCode, cardCode))
    .orderBy(asc(rateCardTerms.sectionNum));
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
