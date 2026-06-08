-- Replace text threshold_display with numeric threshold_min_vnd (actual VND value).
-- NULL = public tier (no minimum). e.g. 70000000 = 70M VND/month for T4.
ALTER TABLE "tier_thresholds" DROP COLUMN "threshold_display";
ALTER TABLE "tier_thresholds" ADD COLUMN "threshold_min_vnd" numeric(15, 0);
