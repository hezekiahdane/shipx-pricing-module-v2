CREATE TABLE "tier_thresholds" (
	"tier_key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"threshold_display" text NOT NULL,
	"sort_order" integer NOT NULL
);
