-- Remove extraction_confidence field from student_profile_draft table
-- This field was used for validation tracking but is now handled by client-side validation

ALTER TABLE "student_profile_draft" 
DROP COLUMN IF EXISTS "extraction_confidence";
