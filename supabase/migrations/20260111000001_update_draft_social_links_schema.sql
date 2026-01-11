-- Migration: Update student_profile_draft.social_links to use specific platform keys
-- Changes from array [{link}] to object {github, linkedin, stackoverflow, kaggle, leetcode}

-- Update the column comment to reflect new structure
COMMENT ON COLUMN public.student_profile_draft.social_links IS 'Social links object: {github: "url", linkedin: "url", stackoverflow: "url", kaggle: "url", leetcode: "url"}';

-- Set default to empty object instead of empty array
ALTER TABLE public.student_profile_draft
ALTER COLUMN social_links SET DEFAULT '{}'::jsonb;
