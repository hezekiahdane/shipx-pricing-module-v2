-- Transit times per country per rate card.
CREATE TABLE IF NOT EXISTS "transit_times" (
  "id"               bigserial PRIMARY KEY NOT NULL,
  "card_code"        text NOT NULL REFERENCES "rate_cards"("code") ON DELETE CASCADE,
  "country_name"     text NOT NULL,
  "country_code"     text,
  "zone_code"        text,
  "transit_time_min" integer,
  "transit_time_max" integer,
  "transit_time_raw" text NOT NULL,
  CONSTRAINT "transit_times_card_code_country_code_unique"
    UNIQUE ("card_code", "country_code")
);

CREATE INDEX IF NOT EXISTS "idx_transit_times_card" ON "transit_times" ("card_code");
