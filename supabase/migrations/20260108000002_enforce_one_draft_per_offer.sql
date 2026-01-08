-- Enforce max one active draft per published offer
-- Migration created: 2026-01-08

-- Add partial unique index to ensure only one active draft per published offer
-- This allows multiple drafts with offer_id = NULL (unpublished drafts)
-- but only ONE active draft for each published offer
CREATE UNIQUE INDEX company_offer_one_active_draft_per_offer
ON company_offer_draft (offer_id)
WHERE offer_id IS NOT NULL
  AND status IN ('editing', 'ready_to_publish');

COMMENT ON INDEX company_offer_one_active_draft_per_offer IS 
  'Ensures max one active draft per published offer. Unpublished drafts (offer_id NULL) are unrestricted.';
