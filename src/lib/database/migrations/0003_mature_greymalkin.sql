ALTER TABLE "rate_cards" ADD COLUMN "discount_public" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "rate_cards" ADD COLUMN "discount_tier1" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "rate_cards" ADD COLUMN "discount_tier2" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "rate_cards" ADD COLUMN "discount_tier3" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "rate_cards" ADD COLUMN "discount_tier4" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "rate_cards" ADD COLUMN "discount_tier5" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "rate_cards" ADD COLUMN "discount_pt" text;