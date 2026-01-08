-- Remove unused columns from company_offer table
-- These fields are not used in the UI and should be removed

-- Drop mission, stage, team_size columns (not used in UI)
ALTER TABLE company_offer DROP COLUMN IF EXISTS mission;
ALTER TABLE company_offer DROP COLUMN IF EXISTS stage;
ALTER TABLE company_offer DROP COLUMN IF EXISTS team_size;

-- Add comment
COMMENT ON TABLE company_offer IS 'Published job offers from companies - only contains fields actively used in UI';
