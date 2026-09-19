-- Step 1 only: Add columns with defaults (no unique constraint yet)
ALTER TABLE "UtilityMeter"
  ADD COLUMN IF NOT EXISTS billing_month INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS billing_year  INTEGER NOT NULL DEFAULT 2025;

-- Step 2: Backfill from created_at
UPDATE "UtilityMeter"
SET
  billing_year  = EXTRACT(YEAR  FROM created_at)::INTEGER,
  billing_month = EXTRACT(MONTH FROM created_at)::INTEGER;
