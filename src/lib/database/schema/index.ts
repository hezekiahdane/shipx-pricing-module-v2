import {
  bigserial,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

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
    weightKg: numeric('weight_kg').notNull(),
    unit: text('unit').default('kg'),
    price: numeric('price'),
  },
  (t) => [
    index('idx_rates_lookup').on(t.cardCode, t.destination, t.weightKg),
    unique().on(t.cardCode, t.destination, t.weightKg),
  ],
);

export type RateCard = typeof rateCards.$inferSelect;
export type Rate = typeof rates.$inferSelect;
