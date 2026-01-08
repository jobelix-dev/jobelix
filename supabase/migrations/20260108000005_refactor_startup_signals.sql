-- Remove startup_signals JSONB column and add seniority as standalone column
-- Migration: 20260108000005_refactor_startup_signals.sql

-- Add seniority column to company_offer_draft
ALTER TABLE company_offer_draft 
ADD COLUMN IF NOT EXISTS seniority TEXT CHECK (seniority IN ('junior', 'mid', 'senior', 'lead', 'executive'));

-- Migrate existing seniority data from startup_signals JSONB to new column
UPDATE company_offer_draft
SET seniority = (startup_signals->>'seniority')::TEXT
WHERE startup_signals IS NOT NULL 
  AND startup_signals->>'seniority' IS NOT NULL;

-- Drop the startup_signals column
ALTER TABLE company_offer_draft 
DROP COLUMN IF EXISTS startup_signals;

-- Add comment
COMMENT ON COLUMN company_offer_draft.seniority IS 'Seniority level for the position: junior, mid, senior, lead, executive';
