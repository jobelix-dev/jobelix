-- Add unique constraints for "one per user" tables
-- This enables UPSERT operations and enforces data integrity at DB level

-- student_profile_draft: one draft per student
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'student_profile_draft_student_id_key' 
        AND conrelid = 'student_profile_draft'::regclass
    ) THEN
        ALTER TABLE "public"."student_profile_draft" 
        ADD CONSTRAINT "student_profile_draft_student_id_key" 
        UNIQUE (student_id);
    END IF;
END $$;

COMMENT ON CONSTRAINT "student_profile_draft_student_id_key" 
ON "public"."student_profile_draft" 
IS 'Ensures one draft per student - enables UPSERT in extract API';

-- Note: student_work_preferences already has unique constraint from creation migration
-- Note: student and company tables use id as PRIMARY KEY (which is auth.uid()), so already unique
