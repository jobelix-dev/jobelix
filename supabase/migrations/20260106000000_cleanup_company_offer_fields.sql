-- Clean up unused and redundant fields from company_offer tables
-- Remove: wage, starting_date (legacy), problem_to_solve, product_area, priority, urgency (redundant)
-- Remove: order_index from all normalized tables (not needed for MVP)

-- Drop unused/redundant columns from company_offer
ALTER TABLE company_offer
  DROP COLUMN IF EXISTS wage,
  DROP COLUMN IF EXISTS starting_date,
  DROP COLUMN IF EXISTS problem_to_solve,
  DROP COLUMN IF EXISTS product_area,
  DROP COLUMN IF EXISTS priority,
  DROP COLUMN IF EXISTS urgency;

-- Drop order_index from all normalized tables
ALTER TABLE offer_responsibilities
  DROP COLUMN IF EXISTS order_index;

ALTER TABLE offer_capabilities
  DROP COLUMN IF EXISTS order_index;

ALTER TABLE offer_questions
  DROP COLUMN IF EXISTS order_index;

ALTER TABLE offer_perks
  DROP COLUMN IF EXISTS order_index;

-- Update comments
COMMENT ON TABLE company_offer IS 'Job offers from companies - streamlined fields for essential matching';
COMMENT ON COLUMN company_offer.description IS 'Full job description including responsibilities, requirements, and what success looks like';
COMMENT ON TABLE offer_responsibilities IS 'Key responsibilities and tasks for the role - display in insertion order';
COMMENT ON TABLE offer_capabilities IS 'Outcome-based capabilities - display in insertion order';
COMMENT ON TABLE offer_questions IS 'Screening questions - display in insertion order';
COMMENT ON TABLE offer_perks IS 'Benefits and perks - display in insertion order';
