-- Split date columns into separate year and month columns for academic (education)
ALTER TABLE "public"."academic"
DROP COLUMN IF EXISTS "starting_date",
DROP COLUMN IF EXISTS "ending_date",
ADD COLUMN "start_year" INTEGER,
ADD COLUMN "start_month" INTEGER,
ADD COLUMN "end_year" INTEGER,
ADD COLUMN "end_month" INTEGER;

-- Add constraints for academic
ALTER TABLE "public"."academic"
ADD CONSTRAINT "academic_start_year_range" CHECK (start_year IS NULL OR (start_year >= 1950 AND start_year <= 2050)),
ADD CONSTRAINT "academic_start_month_range" CHECK (start_month IS NULL OR (start_month >= 1 AND start_month <= 12)),
ADD CONSTRAINT "academic_end_year_range" CHECK (end_year IS NULL OR (end_year >= 1950 AND end_year <= 2050)),
ADD CONSTRAINT "academic_end_month_range" CHECK (end_month IS NULL OR (end_month >= 1 AND end_month <= 12)),
ADD CONSTRAINT "academic_start_year_required" CHECK (start_year IS NOT NULL),
ADD CONSTRAINT "academic_start_month_required" CHECK (start_month IS NOT NULL);

-- Split date columns into separate year and month columns for experience
ALTER TABLE "public"."experience"
DROP CONSTRAINT IF EXISTS "experience_date_order_check",
DROP COLUMN IF EXISTS "starting_date",
DROP COLUMN IF EXISTS "ending_date",
ADD COLUMN "start_year" INTEGER,
ADD COLUMN "start_month" INTEGER,
ADD COLUMN "end_year" INTEGER,
ADD COLUMN "end_month" INTEGER;

-- Add constraints for experience
ALTER TABLE "public"."experience"
ADD CONSTRAINT "experience_start_year_range" CHECK (start_year IS NULL OR (start_year >= 1950 AND start_year <= 2050)),
ADD CONSTRAINT "experience_start_month_range" CHECK (start_month IS NULL OR (start_month >= 1 AND start_month <= 12)),
ADD CONSTRAINT "experience_end_year_range" CHECK (end_year IS NULL OR (end_year >= 1950 AND end_year <= 2050)),
ADD CONSTRAINT "experience_end_month_range" CHECK (end_month IS NULL OR (end_month >= 1 AND end_month <= 12)),
ADD CONSTRAINT "experience_start_year_required" CHECK (start_year IS NOT NULL),
ADD CONSTRAINT "experience_start_month_required" CHECK (start_month IS NOT NULL);

-- Update student_profile_draft JSON structure (education and experience are JSONB)
COMMENT ON COLUMN "public"."academic"."start_year" IS 'Start year (required)';
COMMENT ON COLUMN "public"."academic"."start_month" IS 'Start month 1-12 (required)';
COMMENT ON COLUMN "public"."academic"."end_year" IS 'End year (optional, null if ongoing)';
COMMENT ON COLUMN "public"."academic"."end_month" IS 'End month 1-12 (optional, null if ongoing)';

COMMENT ON COLUMN "public"."experience"."start_year" IS 'Start year (required)';
COMMENT ON COLUMN "public"."experience"."start_month" IS 'Start month 1-12 (required)';
COMMENT ON COLUMN "public"."experience"."end_year" IS 'End year (optional, null if currently working)';
COMMENT ON COLUMN "public"."experience"."end_month" IS 'End month 1-12 (optional, null if currently working)';
