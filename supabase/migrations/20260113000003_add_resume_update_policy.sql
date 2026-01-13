-- Add UPDATE policy to resume table for UPSERT operations
--
-- Problem: The resume upload API uses UPSERT to update metadata (filename)
-- when a user uploads a new resume. Without an UPDATE policy, UPSERT fails
-- when trying to update an existing record.
--
-- Note: The "no UPDATE" guidance in the security doc was about the PDF file
-- itself (which is in storage, not this table). The metadata table needs
-- UPDATE capability for UPSERT to work.

-- Drop if exists (in case it was already created by main migration)
DROP POLICY IF EXISTS "resume_update_own" ON "public"."resume";

CREATE POLICY "resume_update_own"
ON "public"."resume"
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

COMMENT ON POLICY "resume_update_own" ON "public"."resume" 
IS 'Allows users to update their resume metadata (filename). Required for UPSERT operations when uploading new resume version.';
