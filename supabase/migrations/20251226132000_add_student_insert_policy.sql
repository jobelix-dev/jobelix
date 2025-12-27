-- Add INSERT policy for student table
-- Users need to be able to create their own student record when finalizing resume

CREATE POLICY "Enable users to insert their own data"
ON "public"."student"
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());
