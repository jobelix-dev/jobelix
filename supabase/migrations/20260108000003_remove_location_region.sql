-- Migration: Remove region field from offer_locations table
-- Date: 2026-01-08

-- Drop the region column from offer_locations
ALTER TABLE offer_locations DROP COLUMN IF EXISTS region;

-- Update company_offer_draft to remove region from locations JSONB array
-- This updates the default value and existing records
UPDATE company_offer_draft
SET locations = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'city', loc->>'city',
      'country', loc->>'country'
    )
  )
  FROM jsonb_array_elements(locations) AS loc
)
WHERE locations IS NOT NULL AND jsonb_array_length(locations) > 0;

-- Update table comments
COMMENT ON TABLE offer_locations IS 'Work locations for job offers (city, country only)';
