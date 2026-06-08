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

export async function listCardCodesWithRates(): Promise<Set<string>> {
  const db = getDb();
  const rows = await db
    .selectDistinct({ cardCode: rates.cardCode })
    .from(rates);
  return new Set(rows.map((r) => r.cardCode));
}

export async function listTierThresholds(): Promise<TierThreshold[]> {
  const db = getDb();
  return db
    .select()
    .from(tierThresholds)
    .orderBy(asc(tierThresholds.sortOrder));
}

/**
 * Returns transit time info keyed by every available identifier so the
 * RatesTable lookup (first tries rates.zoneCode, then rates.destination)
 * works regardless of how a carrier stores transit data.
 *
 * Keys populated per row: zoneCode, countryCode, countryName — whichever
 * are non-null. For QSM-style data these are short zone codes (C, S1, ROW);
 * for AME-style they are ISO country codes and full country names.
 */
export async function getTransitTimesByZone(
  cardCode: string,
): Promise<Record<string, { min: number | null; max: number | null }>> {
  const db = getDb();
  const rows = await db
    .select({
      zoneCode: transitTimes.zoneCode,
      countryCode: transitTimes.countryCode,
      countryName: transitTimes.countryName,
      transitTimeMin: transitTimes.transitTimeMin,
      transitTimeMax: transitTimes.transitTimeMax,
    })
    .from(transitTimes)
    .where(eq(transitTimes.cardCode, cardCode));

  const result: Record<string, { min: number | null; max: number | null }> = {};

  function addEntry(
    key: string | null | undefined,
    min: number | null,
    max: number | null,
  ) {
    if (!key) return;
    const prev = result[key];
    if (!prev) {
      result[key] = { min, max };
    } else {
      result[key] = {
        min:
          min !== null && (prev.min === null || min < prev.min)
            ? min
            : prev.min,
        max:
          max !== null && (prev.max === null || max > prev.max)
            ? max
            : prev.max,
      };
    }
  }

  for (const row of rows) {
    addEntry(row.zoneCode, row.transitTimeMin, row.transitTimeMax);
    addEntry(row.countryCode, row.transitTimeMin, row.transitTimeMax);
    addEntry(row.countryName, row.transitTimeMin, row.transitTimeMax);
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
