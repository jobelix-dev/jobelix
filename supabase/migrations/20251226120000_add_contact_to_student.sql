-- Add phone_number column to student table (mail_adress already exists for email)
ALTER TABLE "public"."student"
ADD COLUMN IF NOT EXISTS "phone_number" text;

-- Add constraint for phone number length
ALTER TABLE "public"."student" 
ADD CONSTRAINT "student_phone_number_check" 
CHECK (length(phone_number) <= 20);

-- Add comments
COMMENT ON COLUMN "public"."student"."phone_number" IS 'Student contact phone number';
COMMENT ON COLUMN "public"."student"."mail_adress" IS 'Student email address';
