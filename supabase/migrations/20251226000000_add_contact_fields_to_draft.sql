-- Add phone_number and email fields to student_profile_draft
ALTER TABLE "public"."student_profile_draft"
ADD COLUMN IF NOT EXISTS "phone_number" text,
ADD COLUMN IF NOT EXISTS "email" text;

COMMENT ON COLUMN "public"."student_profile_draft"."phone_number" IS 'Student phone number collected during chat validation';
COMMENT ON COLUMN "public"."student_profile_draft"."email" IS 'Student email collected during chat validation';
