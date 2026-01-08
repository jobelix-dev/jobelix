-- Migration: Remove start_date field from company_offer table
-- Date: 2026-01-08
-- Reason: Redundant with availability preference field

-- Drop the start_date column from company_offer
ALTER TABLE company_offer DROP COLUMN IF EXISTS start_date;

-- Update company_offer_draft to remove start_date from work_config JSONB
UPDATE company_offer_draft
SET work_config = work_config - 'start_date'
WHERE work_config ? 'start_date';

-- Update column comment
COMMENT ON COLUMN company_offer_draft.work_config IS 'Work configuration: {remote_mode, employment_type, availability}';
