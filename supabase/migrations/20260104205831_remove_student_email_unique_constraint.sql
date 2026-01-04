-- Remove unique constraint on student email to allow multiple students with same email
ALTER TABLE "public"."student" DROP CONSTRAINT IF EXISTS "student_mail_adress_key";

-- Add index for performance (optional but recommended)
CREATE INDEX IF NOT EXISTS "idx_student_mail_adress" ON "public"."student"("mail_adress");
