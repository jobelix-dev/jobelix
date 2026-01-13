-- =====================================================================
-- COMPREHENSIVE RLS POLICIES - Complete Security Setup
-- =====================================================================
-- This migration implements ALL RLS policies according to the security
-- document (docs/DATABASE_SECURITY_POLICIES.md)
--
-- Strategy:
-- 1. Drop ALL existing policies to start fresh
-- 2. Ensure RLS is enabled on all tables
-- 3. Create comprehensive policies for each table
-- 4. Add storage bucket policies
--
-- Created: January 13, 2026
-- =====================================================================

-- =====================================================================
-- STEP 1: Drop ALL existing policies (clean slate)
-- =====================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on public schema tables
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
    
    -- Drop all policies on storage.objects
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- =====================================================================
-- STEP 2: Enable RLS on all tables
-- =====================================================================

ALTER TABLE "public"."student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."academic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."experience" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."resume" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."student_profile_draft" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."student_work_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."company_offer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."company_offer_draft" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."offer_skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."offer_locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."offer_capabilities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."offer_perks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."offer_responsibilities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."offer_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profile_searched" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."application" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_credits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."daily_credit_grants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."credit_purchases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."api_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."signup_ip_tracking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."skill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."language" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."publication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."certification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."social_link" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."api_call_log" ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- CORE USER TABLES
-- =====================================================================

-- ---------------------------------------------------------------------
-- student table
-- Students can only view/update their own profile
-- Insert only during signup (prevent duplicates)
-- Delete disabled (handled by CASCADE)
-- ---------------------------------------------------------------------

CREATE POLICY "student_select_own"
ON "public"."student"
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "student_insert_own_once"
ON "public"."student"
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = id 
    AND NOT EXISTS (SELECT 1 FROM student WHERE id = auth.uid())
);

CREATE POLICY "student_update_own"
ON "public"."student"
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- No DELETE policy - deletion handled by CASCADE on auth.users

-- ---------------------------------------------------------------------
-- company table
-- Companies can view/update their own profile
-- Students can view companies with published offers
-- ---------------------------------------------------------------------

CREATE POLICY "company_select_own_or_has_offers"
ON "public"."company"
FOR SELECT
TO authenticated
USING (
    auth.uid() = id 
    OR EXISTS (
        SELECT 1 FROM company_offer 
        WHERE company_id = company.id
    )
);

CREATE POLICY "company_insert_own_once"
ON "public"."company"
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = id 
    AND NOT EXISTS (SELECT 1 FROM company WHERE id = auth.uid())
);

CREATE POLICY "company_update_own"
ON "public"."company"
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- No DELETE policy - deletion handled by CASCADE

-- =====================================================================
-- PROFILE & RESUME TABLES
-- =====================================================================

-- ---------------------------------------------------------------------
-- academic table (education)
-- Students can manage their own education entries
-- ---------------------------------------------------------------------

CREATE POLICY "academic_select_own"
ON "public"."academic"
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "academic_insert_own"
ON "public"."academic"
FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "academic_update_own"
ON "public"."academic"
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY "academic_delete_own"
ON "public"."academic"
FOR DELETE
TO authenticated
USING (student_id = auth.uid());

-- ---------------------------------------------------------------------
-- experience table
-- Students can manage their own work experience
-- ---------------------------------------------------------------------

CREATE POLICY "experience_select_own"
ON "public"."experience"
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "experience_insert_own"
ON "public"."experience"
FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "experience_update_own"
ON "public"."experience"
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY "experience_delete_own"
ON "public"."experience"
FOR DELETE
TO authenticated
USING (student_id = auth.uid());

-- ---------------------------------------------------------------------
-- project table
-- Students can manage their own projects
-- ---------------------------------------------------------------------

CREATE POLICY "project_select_own"
ON "public"."project"
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "project_insert_own"
ON "public"."project"
FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "project_update_own"
ON "public"."project"
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY "project_delete_own"
ON "public"."project"
FOR DELETE
TO authenticated
USING (student_id = auth.uid());

-- ---------------------------------------------------------------------
-- skill table
-- Students can manage their own skills
-- ---------------------------------------------------------------------

CREATE POLICY "skill_select_own"
ON "public"."skill"
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "skill_insert_own"
ON "public"."skill"
FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "skill_update_own"
ON "public"."skill"
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY "skill_delete_own"
ON "public"."skill"
FOR DELETE
TO authenticated
USING (student_id = auth.uid());

-- ---------------------------------------------------------------------
-- language table
-- Students can manage their own languages
-- ---------------------------------------------------------------------

CREATE POLICY "language_select_own"
ON "public"."language"
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "language_insert_own"
ON "public"."language"
FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "language_update_own"
ON "public"."language"
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY "language_delete_own"
ON "public"."language"
FOR DELETE
TO authenticated
USING (student_id = auth.uid());

-- ---------------------------------------------------------------------
-- publication table
-- Students can manage their own publications
-- ---------------------------------------------------------------------

CREATE POLICY "publication_select_own"
ON "public"."publication"
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "publication_insert_own"
ON "public"."publication"
FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "publication_update_own"
ON "public"."publication"
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY "publication_delete_own"
ON "public"."publication"
FOR DELETE
TO authenticated
USING (student_id = auth.uid());

-- ---------------------------------------------------------------------
-- certification table
-- Students can manage their own certifications
-- ---------------------------------------------------------------------

CREATE POLICY "certification_select_own"
ON "public"."certification"
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "certification_insert_own"
ON "public"."certification"
FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "certification_update_own"
ON "public"."certification"
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY "certification_delete_own"
ON "public"."certification"
FOR DELETE
TO authenticated
USING (student_id = auth.uid());

-- ---------------------------------------------------------------------
-- social_link table
-- Students can manage their own social links
-- ---------------------------------------------------------------------

CREATE POLICY "social_link_select_own"
ON "public"."social_link"
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "social_link_insert_own"
ON "public"."social_link"
FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "social_link_update_own"
ON "public"."social_link"
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY "social_link_delete_own"
ON "public"."social_link"
FOR DELETE
TO authenticated
USING (student_id = auth.uid());

-- ---------------------------------------------------------------------
-- resume table
-- Students can view/insert/update/delete their own resume records
-- UPDATE policy needed for UPSERT operations when uploading new resume
-- Note: This is for metadata (filename). PDF file is in storage bucket.
-- ---------------------------------------------------------------------

CREATE POLICY "resume_select_own"
ON "public"."resume"
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "resume_insert_own"
ON "public"."resume"
FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "resume_update_own"
ON "public"."resume"
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY "resume_delete_own"
ON "public"."resume"
FOR DELETE
TO authenticated
USING (student_id = auth.uid());

-- ---------------------------------------------------------------------
-- student_profile_draft table
-- Students can manage their own draft (one per student)
-- Note: UNIQUE constraint on student_id enforces one draft per student
-- Insert policy allows student_id = auth.uid() (constraint prevents duplicates)
-- This works with UPSERT operations
-- ---------------------------------------------------------------------

CREATE POLICY "draft_select_own"
ON "public"."student_profile_draft"
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "draft_insert_own"
ON "public"."student_profile_draft"
FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "draft_update_own"
ON "public"."student_profile_draft"
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY "draft_delete_own"
ON "public"."student_profile_draft"
FOR DELETE
TO authenticated
USING (student_id = auth.uid());

-- ---------------------------------------------------------------------
-- student_work_preferences table
-- Students can manage their own preferences (one per student)
-- ---------------------------------------------------------------------

CREATE POLICY "work_prefs_select_own"
ON "public"."student_work_preferences"
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "work_prefs_insert_own_once"
ON "public"."student_work_preferences"
FOR INSERT
TO authenticated
WITH CHECK (
    student_id = auth.uid() 
    AND NOT EXISTS (
        SELECT 1 FROM student_work_preferences 
        WHERE student_id = auth.uid()
    )
);

CREATE POLICY "work_prefs_update_own"
ON "public"."student_work_preferences"
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY "work_prefs_delete_own"
ON "public"."student_work_preferences"
FOR DELETE
TO authenticated
USING (student_id = auth.uid());

-- =====================================================================
-- COMPANY & OFFER TABLES
-- =====================================================================

-- ---------------------------------------------------------------------
-- company_offer table
-- Public SELECT (job board)
-- Companies manage their own offers
-- ---------------------------------------------------------------------

CREATE POLICY "offer_select_public"
ON "public"."company_offer"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "offer_insert_own"
ON "public"."company_offer"
FOR INSERT
TO authenticated
WITH CHECK (company_id = auth.uid());

CREATE POLICY "offer_update_own"
ON "public"."company_offer"
FOR UPDATE
TO authenticated
USING (company_id = auth.uid())
WITH CHECK (company_id = auth.uid());

CREATE POLICY "offer_delete_own"
ON "public"."company_offer"
FOR DELETE
TO authenticated
USING (company_id = auth.uid());

-- ---------------------------------------------------------------------
-- company_offer_draft table
-- Companies can only see/manage their own drafts
-- NEVER visible to students
-- ---------------------------------------------------------------------

CREATE POLICY "offer_draft_select_own"
ON "public"."company_offer_draft"
FOR SELECT
TO authenticated
USING (company_id = auth.uid());

CREATE POLICY "offer_draft_insert_own"
ON "public"."company_offer_draft"
FOR INSERT
TO authenticated
WITH CHECK (company_id = auth.uid());

CREATE POLICY "offer_draft_update_own"
ON "public"."company_offer_draft"
FOR UPDATE
TO authenticated
USING (company_id = auth.uid())
WITH CHECK (company_id = auth.uid());

CREATE POLICY "offer_draft_delete_own"
ON "public"."company_offer_draft"
FOR DELETE
TO authenticated
USING (company_id = auth.uid());

-- ---------------------------------------------------------------------
-- offer_skills table
-- Public SELECT (job search)
-- Only offer owner can modify
-- ---------------------------------------------------------------------

CREATE POLICY "offer_skills_select_public"
ON "public"."offer_skills"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "offer_skills_insert_owner"
ON "public"."offer_skills"
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
);

CREATE POLICY "offer_skills_update_owner"
ON "public"."offer_skills"
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
);

CREATE POLICY "offer_skills_delete_owner"
ON "public"."offer_skills"
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
);

-- ---------------------------------------------------------------------
-- offer_locations table
-- Public SELECT (location-based search)
-- Only offer owner can modify
-- ---------------------------------------------------------------------

CREATE POLICY "offer_locations_select_public"
ON "public"."offer_locations"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "offer_locations_insert_owner"
ON "public"."offer_locations"
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
);

CREATE POLICY "offer_locations_update_owner"
ON "public"."offer_locations"
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
);

CREATE POLICY "offer_locations_delete_owner"
ON "public"."offer_locations"
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
);

-- ---------------------------------------------------------------------
-- offer_capabilities table
-- Public SELECT
-- Only offer owner can modify
-- ---------------------------------------------------------------------

CREATE POLICY "offer_capabilities_select_public"
ON "public"."offer_capabilities"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "offer_capabilities_insert_owner"
ON "public"."offer_capabilities"
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
);

CREATE POLICY "offer_capabilities_update_owner"
ON "public"."offer_capabilities"
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
);

CREATE POLICY "offer_capabilities_delete_owner"
ON "public"."offer_capabilities"
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
);

-- ---------------------------------------------------------------------
-- offer_perks table
-- Public SELECT
-- Only offer owner can modify
-- ---------------------------------------------------------------------

CREATE POLICY "offer_perks_select_public"
ON "public"."offer_perks"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "offer_perks_insert_owner"
ON "public"."offer_perks"
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
);

CREATE POLICY "offer_perks_update_owner"
ON "public"."offer_perks"
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
);

CREATE POLICY "offer_perks_delete_owner"
ON "public"."offer_perks"
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
);

-- ---------------------------------------------------------------------
-- offer_responsibilities table
-- Public SELECT
-- Only offer owner can modify
-- ---------------------------------------------------------------------

CREATE POLICY "offer_responsibilities_select_public"
ON "public"."offer_responsibilities"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "offer_responsibilities_insert_owner"
ON "public"."offer_responsibilities"
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
);

CREATE POLICY "offer_responsibilities_update_owner"
ON "public"."offer_responsibilities"
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
);

CREATE POLICY "offer_responsibilities_delete_owner"
ON "public"."offer_responsibilities"
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
);

-- ---------------------------------------------------------------------
-- offer_questions table
-- Public SELECT
-- Only offer owner can modify
-- ---------------------------------------------------------------------

CREATE POLICY "offer_questions_select_public"
ON "public"."offer_questions"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "offer_questions_insert_owner"
ON "public"."offer_questions"
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
);

CREATE POLICY "offer_questions_update_owner"
ON "public"."offer_questions"
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
);

CREATE POLICY "offer_questions_delete_owner"
ON "public"."offer_questions"
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
);

-- ---------------------------------------------------------------------
-- profile_searched table
-- NOT public - internal company data
-- Only offer owner can see/manage
-- NOTE: id is the FK to company_offer (not offer_id)
-- ---------------------------------------------------------------------

CREATE POLICY "profile_searched_select_owner"
ON "public"."profile_searched"
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = profile_searched.id AND company_id = auth.uid()
    )
);

CREATE POLICY "profile_searched_insert_owner"
ON "public"."profile_searched"
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = profile_searched.id AND company_id = auth.uid()
    )
);

CREATE POLICY "profile_searched_update_owner"
ON "public"."profile_searched"
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = profile_searched.id AND company_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = profile_searched.id AND company_id = auth.uid()
    )
);

CREATE POLICY "profile_searched_delete_owner"
ON "public"."profile_searched"
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = profile_searched.id AND company_id = auth.uid()
    )
);

-- =====================================================================
-- APPLICATION SYSTEM
-- =====================================================================

-- ---------------------------------------------------------------------
-- application table
-- Dual visibility:
-- - Students see their own applications
-- - Companies see applications to their offers
-- Students can apply (prevent duplicates)
-- Only companies can update status
-- Students can withdraw unseen applications
-- ---------------------------------------------------------------------

CREATE POLICY "application_select_dual"
ON "public"."application"
FOR SELECT
TO authenticated
USING (
    student_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
);

CREATE POLICY "application_insert_student_no_duplicate"
ON "public"."application"
FOR INSERT
TO authenticated
WITH CHECK (
    student_id = auth.uid() 
    AND NOT EXISTS (
        SELECT 1 FROM application 
        WHERE student_id = auth.uid() AND offer_id = application.offer_id
    )
);

CREATE POLICY "application_update_company_only"
ON "public"."application"
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM company_offer 
        WHERE id = offer_id AND company_id = auth.uid()
    )
);

CREATE POLICY "application_delete_student_unseen"
ON "public"."application"
FOR DELETE
TO authenticated
USING (
    student_id = auth.uid() 
    AND curent_state = 'unseen'
);

-- =====================================================================
-- CREDITS SYSTEM
-- =====================================================================

-- ---------------------------------------------------------------------
-- user_credits table
-- Users can only view their own balance
-- All modifications via RPC functions only (SECURITY DEFINER)
-- ---------------------------------------------------------------------

CREATE POLICY "user_credits_select_own"
ON "public"."user_credits"
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE - all via RPC functions only

-- ---------------------------------------------------------------------
-- daily_credit_grants table
-- Users can view their own grant history
-- All modifications via RPC functions only
-- ---------------------------------------------------------------------

CREATE POLICY "daily_grants_select_own"
ON "public"."daily_credit_grants"
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE - all via RPC functions only

-- ---------------------------------------------------------------------
-- credit_purchases table
-- Users can view their own purchase history
-- All modifications via Stripe webhook/RPC only
-- ---------------------------------------------------------------------

CREATE POLICY "credit_purchases_select_own"
ON "public"."credit_purchases"
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE for users - service role only

-- =====================================================================
-- AUTHENTICATION & API ACCESS
-- =====================================================================

-- ---------------------------------------------------------------------
-- api_tokens table
-- Users can view/delete their own token
-- No INSERT/UPDATE - auto-generated on signup
-- ---------------------------------------------------------------------

CREATE POLICY "api_tokens_select_own"
ON "public"."api_tokens"
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "api_tokens_delete_own"
ON "public"."api_tokens"
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- No INSERT/UPDATE - handled by triggers/backend

-- =====================================================================
-- FEEDBACK & TRACKING
-- =====================================================================

-- ---------------------------------------------------------------------
-- user_feedback table
-- Users can view their own feedback
-- All authenticated users can submit feedback
-- No UPDATE/DELETE for users
-- ---------------------------------------------------------------------

CREATE POLICY "feedback_select_own"
ON "public"."user_feedback"
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "feedback_insert_authenticated"
ON "public"."user_feedback"
FOR INSERT
TO authenticated
WITH CHECK (true);

-- No UPDATE/DELETE - feedback is immutable after submission

-- ---------------------------------------------------------------------
-- signup_ip_tracking table
-- No public access - backend only (service role)
-- ---------------------------------------------------------------------

-- No policies - service role bypasses RLS

-- ---------------------------------------------------------------------
-- api_call_log table
-- Users can view their own API call logs
-- All modifications via RPC functions only
-- ---------------------------------------------------------------------

CREATE POLICY "api_call_log_select_own"
ON "public"."api_call_log"
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE - all via RPC functions only

-- =====================================================================
-- STORAGE BUCKET POLICIES
-- =====================================================================

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Companies can view applicant resumes" ON storage.objects;

-- Allow users to upload their own resumes
CREATE POLICY "Users can upload own resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'resumes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to read their own resumes
CREATE POLICY "Users can read own resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'resumes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own resumes
CREATE POLICY "Users can update own resumes"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'resumes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
    bucket_id = 'resumes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own resumes
CREATE POLICY "Users can delete own resumes"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'resumes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Companies can view resumes of applicants to their offers
CREATE POLICY "Companies can view applicant resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'resumes' 
    AND EXISTS (
        SELECT 1 FROM application a
        JOIN company_offer o ON a.offer_id = o.id
        WHERE o.company_id = auth.uid()
        AND a.student_id::text = (storage.foldername(name))[1]
    )
);

-- =====================================================================
-- INDEXES FOR RLS PERFORMANCE
-- =====================================================================
-- Add indexes for columns used in RLS policy JOINs

CREATE INDEX IF NOT EXISTS idx_company_offer_company_id 
ON company_offer(company_id);

CREATE INDEX IF NOT EXISTS idx_application_student_id 
ON application(student_id);

CREATE INDEX IF NOT EXISTS idx_application_offer_id 
ON application(offer_id);

CREATE INDEX IF NOT EXISTS idx_offer_skills_offer_id 
ON offer_skills(offer_id);

CREATE INDEX IF NOT EXISTS idx_offer_locations_offer_id 
ON offer_locations(offer_id);

CREATE INDEX IF NOT EXISTS idx_offer_capabilities_offer_id 
ON offer_capabilities(offer_id);

CREATE INDEX IF NOT EXISTS idx_offer_perks_offer_id 
ON offer_perks(offer_id);

CREATE INDEX IF NOT EXISTS idx_offer_responsibilities_offer_id 
ON offer_responsibilities(offer_id);

CREATE INDEX IF NOT EXISTS idx_offer_questions_offer_id 
ON offer_questions(offer_id);

-- Note: profile_searched.id is the FK to company_offer.id (not offer_id)

-- =====================================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================================

COMMENT ON POLICY "student_select_own" ON "public"."student" 
IS 'Students can only view their own profile';

COMMENT ON POLICY "company_select_own_or_has_offers" ON "public"."company" 
IS 'Companies see own profile; students see companies with published offers';

COMMENT ON POLICY "offer_select_public" ON "public"."company_offer" 
IS 'All authenticated users can browse job offers (public job board)';

COMMENT ON POLICY "offer_draft_select_own" ON "public"."company_offer_draft" 
IS 'Draft offers are NEVER visible to students - only to offer owner';

COMMENT ON POLICY "application_select_dual" ON "public"."application" 
IS 'Dual visibility: students see their applications, companies see applications to their offers';

COMMENT ON POLICY "user_credits_select_own" ON "public"."user_credits" 
IS 'Users view own balance - modifications via RPC only to prevent fraud';

COMMENT ON POLICY "profile_searched_select_owner" ON "public"."profile_searched" 
IS 'NOT public - internal company search criteria';

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Uncomment to verify policies were created:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================

-- Summary:
-- ✅ All existing policies dropped and recreated from scratch
-- ✅ RLS enabled on all tables
-- ✅ Student tables: Own data only
-- ✅ Company tables: Own data + public job offers
-- ✅ Application system: Dual visibility (student + company)
-- ✅ Credits system: View only - modifications via RPC
-- ✅ Storage bucket: User folders + company applicant access
-- ✅ Performance indexes added for RLS JOINs
-- ✅ Comprehensive documentation comments

-- All policies follow the security document:
-- docs/DATABASE_SECURITY_POLICIES.md
