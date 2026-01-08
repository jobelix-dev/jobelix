-- Remove timezone_min, timezone_max from company_offer table and is_primary from offer_locations
-- Migration created: 2026-01-08

-- Remove timezone columns from company_offer table
ALTER TABLE company_offer
  DROP COLUMN IF EXISTS timezone_min,
  DROP COLUMN IF EXISTS timezone_max;

-- Remove is_primary column from offer_locations table
ALTER TABLE offer_locations
  DROP COLUMN IF EXISTS is_primary;

-- Update comment for offer_locations table to reflect removed field
COMMENT ON TABLE offer_locations IS 'Geographic locations where offer is available';

-- Update company_offer_draft default values to remove timezone fields
ALTER TABLE company_offer_draft
  ALTER COLUMN work_config SET DEFAULT '{
    "remote_mode": null,
    "employment_type": null,
    "start_date": null,
    "availability": null
  }'::jsonb;

-- Update existing draft records to remove timezone fields from work_config
UPDATE company_offer_draft
SET work_config = work_config - 'timezone_min' - 'timezone_max'
WHERE work_config ? 'timezone_min' OR work_config ? 'timezone_max';

-- Update comment for locations column to reflect removed field
COMMENT ON COLUMN company_offer_draft.locations IS 'Array of {city, country, region}';

