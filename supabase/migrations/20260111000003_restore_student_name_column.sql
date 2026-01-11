-- Migration: Restore student_name column to student table
-- UI uses a single full name field, so we need student_name instead of first_name/last_name

-- Add student_name column back
ALTER TABLE public.student
ADD COLUMN IF NOT EXISTS student_name TEXT;

-- Update comment
COMMENT ON COLUMN public.student.student_name IS 'Full name of the student (single field for first + last name)';
