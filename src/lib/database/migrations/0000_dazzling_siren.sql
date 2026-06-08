CREATE TABLE "rate_cards" (
	"code" text PRIMARY KEY NOT NULL,
	"product_name" text NOT NULL,
	"category" text,
	"status" text DEFAULT 'Active',
	"operator" text,
	"service_code" text,
	"effective_date" date,
	"currency" text DEFAULT 'VND',
	"source_file" text,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rates" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"card_code" text NOT NULL,
	"destination" text NOT NULL,
	"zone_code" text,
	"weight_kg" numeric NOT NULL,
	"unit" text DEFAULT 'kg',
	"price" numeric,
	CONSTRAINT "rates_card_code_destination_weight_kg_unique" UNIQUE("card_code","destination","weight_kg")
);
--> statement-breakpoint
ALTER TABLE "rates" ADD CONSTRAINT "rates_card_code_rate_cards_code_fk" FOREIGN KEY ("card_code") REFERENCES "public"."rate_cards"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_rates_lookup" ON "rates" USING btree ("card_code","destination","weight_kg");