-- Simplify social_link table to just store URLs without platform categorization
-- Drop the platform column and its constraint

ALTER TABLE social_link 
DROP COLUMN IF EXISTS platform;

-- Rename url to link for consistency with other tables
ALTER TABLE social_link
RENAME COLUMN url TO link;
