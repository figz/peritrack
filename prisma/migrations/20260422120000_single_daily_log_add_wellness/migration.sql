-- Deduplicate: keep the earliest-created entry per date, delete any extras
DELETE FROM "log_entries"
WHERE id NOT IN (
  SELECT DISTINCT ON ("entry_date") id
  FROM "log_entries"
  ORDER BY "entry_date", "created_at" ASC
);

-- Drop old composite unique index
DROP INDEX "log_entries_entry_date_entry_period_key";

-- Drop entry_period column
ALTER TABLE "log_entries" DROP COLUMN "entry_period";

-- Add new wellness columns
ALTER TABLE "log_entries" ADD COLUMN "hydration" SMALLINT;
ALTER TABLE "log_entries" ADD COLUMN "nutrition_quality" SMALLINT;
ALTER TABLE "log_entries" ADD COLUMN "daily_walk" BOOLEAN;
ALTER TABLE "log_entries" ADD COLUMN "pt_exercises" BOOLEAN;
ALTER TABLE "log_entries" ADD COLUMN "other_exercise" BOOLEAN;

-- Add single-date unique constraint
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_entry_date_key" UNIQUE ("entry_date");

-- Drop EntryPeriod enum
DROP TYPE "EntryPeriod";
