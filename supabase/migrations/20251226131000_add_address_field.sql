-- Add address field to student_profile_draft table
ALTER TABLE "public"."student_profile_draft" 
ADD COLUMN "address" text;

ALTER TABLE "public"."student_profile_draft" 
ADD CONSTRAINT "student_profile_draft_address_check" 
CHECK (length(address) <= 200);

-- Also add address to student table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student' AND column_name = 'address'
  ) THEN
    ALTER TABLE "public"."student" 
    ADD COLUMN "address" text;
    
    ALTER TABLE "public"."student" 
    ADD CONSTRAINT "student_address_check" 
    CHECK (length(address) <= 200);
  END IF;
END $$;
