-- Fix student_profile_draft status field to track unpublished changes
-- Changes status values to be more meaningful:
-- 'editing' = draft has unpublished changes
-- 'published' = draft matches published profile (no unpublished changes)

-- Update the constraint to use new status values
ALTER TABLE student_profile_draft 
  DROP CONSTRAINT IF EXISTS student_profile_draft_status_check;

ALTER TABLE student_profile_draft
  ADD CONSTRAINT student_profile_draft_status_check 
  CHECK (status IN ('editing', 'published'));

-- Update existing rows to use new status values
UPDATE student_profile_draft 
SET status = CASE 
  WHEN status = 'confirmed' THEN 'published'
  ELSE 'editing'
END;

-- Set default to 'editing' (has unpublished changes)
ALTER TABLE student_profile_draft 
  ALTER COLUMN status SET DEFAULT 'editing';

COMMENT ON COLUMN student_profile_draft.status IS 
'Tracks whether draft has unpublished changes: editing (unsaved changes) or published (matches live profile)';
