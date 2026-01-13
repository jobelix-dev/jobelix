-- Fix student_profile_draft INSERT policy to work with UPSERT
-- 
-- Problem: The INSERT policy had a NOT EXISTS check that blocks UPSERT
-- when a row already exists. UPSERT tries INSERT first, fails the policy,
-- and never gets to try UPDATE.
--
-- Solution: Remove NOT EXISTS check from INSERT policy.
-- The UNIQUE constraint on student_id already prevents duplicates at DB level.

-- Drop the old policy (may have been created by previous migration with different name)
DROP POLICY IF EXISTS "draft_insert_own_once" ON "public"."student_profile_draft";
DROP POLICY IF EXISTS "draft_insert_own" ON "public"."student_profile_draft";

-- Create new policy that allows INSERT for own student_id
-- (UNIQUE constraint enforces one per student)
CREATE POLICY "draft_insert_own"
ON "public"."student_profile_draft"
FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

-- Add comment explaining why we don't need NOT EXISTS
COMMENT ON POLICY "draft_insert_own" ON "public"."student_profile_draft" 
IS 'Allows users to insert their own draft. UNIQUE constraint on student_id enforces one draft per student. Simplified for UPSERT compatibility.';
