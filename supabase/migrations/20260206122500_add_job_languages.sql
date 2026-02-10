-- Migration: Add job_languages column to student_work_preferences
-- Purpose: Allow users to specify which languages they can read job postings in.
--          Jobs in other languages will be automatically skipped by the bot.

-- Add job_languages column with default to English
ALTER TABLE student_work_preferences 
ADD COLUMN IF NOT EXISTS job_languages text[] DEFAULT ARRAY['en']::text[];

-- Add comment for documentation
COMMENT ON COLUMN student_work_preferences.job_languages IS 
  'ISO 639-1 language codes for acceptable job description languages. Defaults to English only. Examples: en (English), fr (French), de (German), es (Spanish)';
