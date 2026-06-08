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

export type RateCard = typeof rateCards.$inferSelect;
export type Rate = typeof rates.$inferSelect;
export type TierThreshold = typeof tierThresholds.$inferSelect;
