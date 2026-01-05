-- Simplify certification table to only include essential fields
-- Remove: description, issue_year, issue_month, expiry_year, expiry_month, credential_id
-- Keep: name, issuing_organization, credential_url (renamed to url for consistency)

-- Drop old constraints
ALTER TABLE "public"."certification"
DROP CONSTRAINT IF EXISTS "certification_description_check",
DROP CONSTRAINT IF EXISTS "certification_issue_year_range",
DROP CONSTRAINT IF EXISTS "certification_issue_month_range",
DROP CONSTRAINT IF EXISTS "certification_expiry_year_range",
DROP CONSTRAINT IF EXISTS "certification_expiry_month_range",
DROP CONSTRAINT IF EXISTS "certification_credential_id_check",
DROP CONSTRAINT IF EXISTS "certification_credential_url_check";

-- Remove unnecessary columns
ALTER TABLE "public"."certification"
DROP COLUMN IF EXISTS "description",
DROP COLUMN IF EXISTS "issue_year",
DROP COLUMN IF EXISTS "issue_month",
DROP COLUMN IF EXISTS "expiry_year",
DROP COLUMN IF EXISTS "expiry_month",
DROP COLUMN IF EXISTS "credential_id";

-- Rename credential_url to url for consistency with other tables
ALTER TABLE "public"."certification"
RENAME COLUMN "credential_url" TO "url";

-- Add constraint for url
ALTER TABLE "public"."certification"
ADD CONSTRAINT "certification_url_check" CHECK (url IS NULL OR length(url) <= 500);

-- Update comments
COMMENT ON TABLE "public"."certification" IS 'Student certifications and awards';
COMMENT ON COLUMN "public"."certification"."name" IS 'Certification or award name (required)';
COMMENT ON COLUMN "public"."certification"."issuing_organization" IS 'Organization that issued the certification (optional)';
COMMENT ON COLUMN "public"."certification"."url" IS 'URL to verify or view credential (optional)';
