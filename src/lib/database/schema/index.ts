import {
  bigserial,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;

export const rateCards = pgTable('rate_cards', {
  code: text('code').primaryKey(),
  productName: text('product_name').notNull(),
  category: text('category'),
  status: text('status').default('Active'),
  operator: text('operator'),
  serviceCode: text('service_code'),
  effectiveDate: date('effective_date'),
  currency: text('currency').default('VND'),
  sourceFile: text('source_file'),
  // Tier discount percentages (e.g. 1.5 = 1.5%). NULL = not applicable.
  discountPublic: numeric('discount_public', { precision: 5, scale: 2 }),
  discountTier1: numeric('discount_tier1', { precision: 5, scale: 2 }),
  discountTier2: numeric('discount_tier2', { precision: 5, scale: 2 }),
  discountTier3: numeric('discount_tier3', { precision: 5, scale: 2 }),
  discountTier4: numeric('discount_tier4', { precision: 5, scale: 2 }),
  discountTier5: numeric('discount_tier5', { precision: 5, scale: 2 }),
  discountPt: text('discount_pt'), // 'Contact Manager' or NULL
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const rates = pgTable(
  'rates',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    cardCode: text('card_code')
      .notNull()
      .references(() => rateCards.code, { onDelete: 'cascade' }),
    destination: text('destination').notNull(),
    zoneCode: text('zone_code'),
    weightKg: numeric('weight_kg', { precision: 10, scale: 3 }).notNull(),
    unit: text('unit').default('kg'),
    price: numeric('price', { precision: 15, scale: 4 }),
  },
  (t) => [
    index('idx_rates_lookup').on(t.cardCode, t.destination, t.weightKg),
    unique().on(t.cardCode, t.destination, t.weightKg),
  ],
);

// Global tier threshold configuration.
// One row per tier. thresholdMinVnd is the minimum monthly revenue in VND
// required to qualify for this tier. NULL = public tier (no minimum).
export const tierThresholds = pgTable('tier_thresholds', {
  tierKey: text('tier_key').primaryKey(),
  label: text('label').notNull(),
  // e.g. 20000000 for T1 (>= 20 000 000 VND/month). NULL for public tier.
  thresholdMinVnd: numeric('threshold_min_vnd', { precision: 15, scale: 0 }),
  sortOrder: integer('sort_order').notNull(),
});

// Per-country transit times for a rate card.
// transit_time_min / max are parsed from the raw string (e.g. "14 - 22" → 14, 22).
export const transitTimes = pgTable(
  'transit_times',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    cardCode: text('card_code')
      .notNull()
      .references(() => rateCards.code, { onDelete: 'cascade' }),
    countryName: text('country_name').notNull(),
    countryCode: text('country_code'),
    zoneCode: text('zone_code'),
    transitTimeMin: integer('transit_time_min'),
    transitTimeMax: integer('transit_time_max'),
    transitTimeRaw: text('transit_time_raw').notNull(),
  },
  (t) => [
    index('idx_transit_times_card').on(t.cardCode),
    unique().on(t.cardCode, t.countryCode),
  ],
);

// Terms & Conditions sections for a rate card. One row per numbered section.
export const rateCardTerms = pgTable(
  'rate_card_terms',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    cardCode: text('card_code')
      .notNull()
      .references(() => rateCards.code, { onDelete: 'cascade' }),
    sectionNum: integer('section_num').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
  },
  (t) => [
    index('idx_terms_card').on(t.cardCode),
    unique().on(t.cardCode, t.sectionNum),
  ],
);

export type RateCard = typeof rateCards.$inferSelect;
export type Rate = typeof rates.$inferSelect;
export type TierThreshold = typeof tierThresholds.$inferSelect;
export type TransitTime = typeof transitTimes.$inferSelect;
export type RateCardTerm = typeof rateCardTerms.$inferSelect;
