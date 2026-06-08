-- Terms & Conditions sections, one row per numbered section per rate card.
CREATE TABLE IF NOT EXISTS "rate_card_terms" (
  "id"          bigserial PRIMARY KEY NOT NULL,
  "card_code"   text NOT NULL REFERENCES "rate_cards"("code") ON DELETE CASCADE,
  "section_num" integer NOT NULL,
  "title"       text NOT NULL,
  "body"        text NOT NULL,
  CONSTRAINT "rate_card_terms_card_code_section_num_unique"
    UNIQUE ("card_code", "section_num")
);

CREATE INDEX IF NOT EXISTS "idx_terms_card" ON "rate_card_terms" ("card_code");
