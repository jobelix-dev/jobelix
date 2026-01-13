-- Migration 08: Indexes and Triggers (Performance Layer)
-- Purpose: Optimize query performance and maintain data consistency
-- Dependencies: All table migrations (01-06)
-- Note: Individual table indexes are already created in their migrations
--       This file is for performance optimizations added after initial deployment

set check_function_bodies = off;

-- ============================================================================
-- Utility Function: Auto-update timestamp trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end; 
$function$;

-- ============================================================================
-- Triggers for Timestamp Management
-- ============================================================================

-- Student profile draft: Auto-update on changes
CREATE TRIGGER set_updated_at_student_draft
  BEFORE UPDATE ON student_profile_draft
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Company offer draft: Auto-update on changes
CREATE TRIGGER set_updated_at_company_draft
  BEFORE UPDATE ON company_offer_draft
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Student work preferences: Auto-update on changes
CREATE TRIGGER set_updated_at_work_prefs
  BEFORE UPDATE ON student_work_preferences
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- User feedback: Auto-update on changes (uses separate function for feedback table)
CREATE TRIGGER update_feedback_updated_at_trigger
  BEFORE UPDATE ON user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();

-- ============================================================================
-- Additional Performance Indexes
-- ============================================================================

-- These are additional composite/covering indexes beyond the basic FK indexes
-- already created in table migrations. Add new performance indexes here.

-- Example: Index for finding students by email (used in admin search)
-- CREATE INDEX IF NOT EXISTS idx_student_email_search 
--   ON student USING btree (mail_adress) WHERE mail_adress IS NOT NULL;

-- Example: Index for finding offers by status and publish date
-- CREATE INDEX IF NOT EXISTS idx_offer_status_published 
--   ON company_offer USING btree (status, published_at DESC) 
--   WHERE status = 'published';

-- Note: Most indexes are already defined in individual table migrations.
-- This file is for adding new performance indexes discovered through
-- query analysis and monitoring.
