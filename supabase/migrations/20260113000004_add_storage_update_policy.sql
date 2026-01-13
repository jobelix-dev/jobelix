-- Add UPDATE policy for storage.objects to allow file overwrites
-- This fixes the "new row violates row-level security policy" error when uploading a resume twice

-- Drop if exists (in case it was already created by main migration)
DROP POLICY IF EXISTS "Users can update own resumes" ON storage.objects;

CREATE POLICY "Users can update own resumes"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
