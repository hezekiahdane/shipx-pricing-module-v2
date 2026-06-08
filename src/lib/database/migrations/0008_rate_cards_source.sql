-- Origin/source country for each rate card. Defaults to VN.
ALTER TABLE "rate_cards" ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'VN';
