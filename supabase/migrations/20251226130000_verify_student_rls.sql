-- Verify and fix student table RLS policies
-- The student table should allow authenticated users to update their own records

-- First, drop existing update policy if it exists
DROP POLICY IF EXISTS "Enable users to update their own data" ON "public"."student";

-- Recreate the update policy with explicit permissions
CREATE POLICY "Enable users to update their own data"
ON "public"."student"
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Note: student_profile_draft already has RLS policy from migration 20251225235902
-- No need to add duplicate policies here
