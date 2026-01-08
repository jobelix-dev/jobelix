-- Simplify offer_questions to just text questions (no type, no is_required)
-- Migration created: 2026-01-08

-- Remove type and is_required columns from offer_questions
ALTER TABLE offer_questions
  DROP COLUMN IF EXISTS type,
  DROP COLUMN IF EXISTS is_required;

-- Update table comment
COMMENT ON TABLE offer_questions IS 'Simple text screening questions for candidates';

-- Update company_offer_draft comment for questions array
COMMENT ON COLUMN company_offer_draft.questions IS 'Array of {question}';
