-- Migration: Update social_link table to support only specific platforms
-- Changes the table from storing generic links to dedicated columns for:
-- GitHub, LinkedIn, StackOverflow, Kaggle, LeetCode

-- Drop the generic link column
ALTER TABLE social_link 
DROP COLUMN IF EXISTS link;

-- Add specific platform columns
ALTER TABLE social_link
ADD COLUMN github TEXT,
ADD COLUMN linkedin TEXT,
ADD COLUMN stackoverflow TEXT,
ADD COLUMN kaggle TEXT,
ADD COLUMN leetcode TEXT;

-- Add constraints for URL validation (basic length checks)
ALTER TABLE social_link
ADD CONSTRAINT social_link_github_check CHECK (github IS NULL OR (length(github) >= 1 AND length(github) <= 500)),
ADD CONSTRAINT social_link_linkedin_check CHECK (linkedin IS NULL OR (length(linkedin) >= 1 AND length(linkedin) <= 500)),
ADD CONSTRAINT social_link_stackoverflow_check CHECK (stackoverflow IS NULL OR (length(stackoverflow) >= 1 AND length(stackoverflow) <= 500)),
ADD CONSTRAINT social_link_kaggle_check CHECK (kaggle IS NULL OR (length(kaggle) >= 1 AND length(kaggle) <= 500)),
ADD CONSTRAINT social_link_leetcode_check CHECK (leetcode IS NULL OR (length(leetcode) >= 1 AND length(leetcode) <= 500));

-- Update table comment
COMMENT ON TABLE social_link IS 'Student social media and professional links - supports GitHub, LinkedIn, StackOverflow, Kaggle, and LeetCode';

-- Add column comments
COMMENT ON COLUMN social_link.github IS 'GitHub profile URL';
COMMENT ON COLUMN social_link.linkedin IS 'LinkedIn profile URL';
COMMENT ON COLUMN social_link.stackoverflow IS 'Stack Overflow profile URL';
COMMENT ON COLUMN social_link.kaggle IS 'Kaggle profile URL';
COMMENT ON COLUMN social_link.leetcode IS 'LeetCode profile URL';
