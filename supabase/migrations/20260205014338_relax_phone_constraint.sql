-- =====================================================================
-- Migration: Relax phone number constraint
-- Description: Increase max phone length from 20 to 50 characters
--              to allow users to enter any format they want.
--              Normalization happens at finalize time, but we shouldn't
--              block saves if the format is unusual.
-- =====================================================================

-- Drop the old constraint
ALTER TABLE "public"."student" DROP CONSTRAINT IF EXISTS "student_phone_number_check";

-- Add new relaxed constraint (50 chars should be enough for any format)
ALTER TABLE "public"."student" ADD CONSTRAINT "student_phone_number_check" 
CHECK (phone_number IS NULL OR length(phone_number) <= 50);
