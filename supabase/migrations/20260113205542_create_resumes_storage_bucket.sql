-- Create resumes storage bucket for PDF uploads
-- Each student can upload their resume (one per student)
-- Bucket: resumes
-- Path structure: {student_id}/resume.pdf

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  false, -- Not public (requires authentication)
  5242880, -- 5MB max file size
  ARRAY['application/pdf'] -- Only PDF files allowed
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Students can upload their own resume
CREATE POLICY "Students can upload their own resume"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  (SELECT role FROM auth.users WHERE id = auth.uid()) = 'student'
);

-- RLS Policy: Students can update their own resume
CREATE POLICY "Students can update their own resume"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  (SELECT role FROM auth.users WHERE id = auth.uid()) = 'student'
)
WITH CHECK (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  (SELECT role FROM auth.users WHERE id = auth.uid()) = 'student'
);

-- RLS Policy: Students can read their own resume
CREATE POLICY "Students can read their own resume"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  (SELECT role FROM auth.users WHERE id = auth.uid()) = 'student'
);

-- RLS Policy: Students can delete their own resume
CREATE POLICY "Students can delete their own resume"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  (SELECT role FROM auth.users WHERE id = auth.uid()) = 'student'
);
