-- Migration 08: Indexes and Triggers (Performance Layer)
-- Purpose: Optimize query performance and maintain data consistency
-- Dependencies: All table migrations (01-06)
-- Note: Individual table indexes are already created in their migrations
--       This file is for performance optimizations added after initial deployment

set check_function_bodies = off;

-- ============================================================================
-- Protection Function: Prevent updates to immutable columns
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_immutable_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Protect primary key (id) - skip for tables without id column
  IF TG_TABLE_NAME NOT IN ('resume') THEN
    IF OLD.id IS DISTINCT FROM NEW.id THEN
      RAISE EXCEPTION 'Cannot update primary key column: id';
    END IF;
  END IF;
  
  -- Protect created_at timestamp
  IF TG_TABLE_NAME NOT IN ('signup_ip_tracking', 'api_call_log') THEN
    IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
      RAISE EXCEPTION 'Cannot update immutable column: created_at';
    END IF;
  END IF;
  
  -- Protect foreign keys based on column existence
  IF TG_TABLE_NAME IN ('academic', 'experience', 'project', 'skill', 'language', 
                        'publication', 'certification', 'social_link', 'resume',
                        'student_profile_draft', 'student_work_preferences') THEN
    IF OLD.student_id IS DISTINCT FROM NEW.student_id THEN
      RAISE EXCEPTION 'Cannot update foreign key column: student_id';
    END IF;
  END IF;
  
  IF TG_TABLE_NAME IN ('company_offer', 'company_offer_draft') THEN
    IF OLD.company_id IS DISTINCT FROM NEW.company_id THEN
      RAISE EXCEPTION 'Cannot update foreign key column: company_id';
    END IF;
  END IF;
  
  IF TG_TABLE_NAME IN ('offer_skills', 'offer_locations', 'offer_responsibilities',
                        'offer_capabilities', 'offer_questions', 'offer_perks') THEN
    IF OLD.offer_id IS DISTINCT FROM NEW.offer_id THEN
      RAISE EXCEPTION 'Cannot update foreign key column: offer_id';
    END IF;
  END IF;
  
  IF TG_TABLE_NAME = 'application' THEN
    IF OLD.student_id IS DISTINCT FROM NEW.student_id THEN
      RAISE EXCEPTION 'Cannot update foreign key column: student_id';
    END IF;
    IF OLD.offer_id IS DISTINCT FROM NEW.offer_id THEN
      RAISE EXCEPTION 'Cannot update foreign key column: offer_id';
    END IF;
  END IF;
  
  IF TG_TABLE_NAME IN ('api_tokens', 'api_call_log', 'user_credits', 
                        'daily_credit_grants', 'credit_purchases') THEN
    IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
      RAISE EXCEPTION 'Cannot update foreign key column: user_id';
    END IF;
  END IF;
  
  -- Protect Stripe idempotency keys
  IF TG_TABLE_NAME = 'credit_purchases' THEN
    IF OLD.stripe_event_id IS DISTINCT FROM NEW.stripe_event_id AND OLD.stripe_event_id IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot update idempotency key: stripe_event_id';
    END IF;
    IF OLD.stripe_payment_intent_id IS DISTINCT FROM NEW.stripe_payment_intent_id AND OLD.stripe_payment_intent_id IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot update idempotency key: stripe_payment_intent_id';
    END IF;
    IF OLD.stripe_checkout_session_id IS DISTINCT FROM NEW.stripe_checkout_session_id AND OLD.stripe_checkout_session_id IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot update idempotency key: stripe_checkout_session_id';
    END IF;
  END IF;
  
  -- Protect daily grant composite key
  IF TG_TABLE_NAME = 'daily_credit_grants' THEN
    IF OLD.granted_date IS DISTINCT FROM NEW.granted_date THEN
      RAISE EXCEPTION 'Cannot update composite key column: granted_date';
    END IF;
  END IF;
  
  -- Protect API token
  IF TG_TABLE_NAME = 'api_tokens' THEN
    IF OLD.token IS DISTINCT FROM NEW.token THEN
      RAISE EXCEPTION 'Cannot update immutable column: token';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- Utility Function: Auto-update timestamp trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
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
-- Immutable Column Protection Triggers
-- ============================================================================

-- Student system tables
CREATE TRIGGER protect_student_immutable
  BEFORE UPDATE ON student
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_student_draft_immutable
  BEFORE UPDATE ON student_profile_draft
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_academic_immutable
  BEFORE UPDATE ON academic
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_experience_immutable
  BEFORE UPDATE ON experience
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_project_immutable
  BEFORE UPDATE ON project
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_skill_immutable
  BEFORE UPDATE ON skill
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_language_immutable
  BEFORE UPDATE ON language
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_publication_immutable
  BEFORE UPDATE ON publication
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_certification_immutable
  BEFORE UPDATE ON certification
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_social_link_immutable
  BEFORE UPDATE ON social_link
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_resume_immutable
  BEFORE UPDATE ON resume
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_work_preferences_immutable
  BEFORE UPDATE ON student_work_preferences
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

-- Company system tables
CREATE TRIGGER protect_company_immutable
  BEFORE UPDATE ON company
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_company_offer_immutable
  BEFORE UPDATE ON company_offer
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_company_offer_draft_immutable
  BEFORE UPDATE ON company_offer_draft
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_offer_skills_immutable
  BEFORE UPDATE ON offer_skills
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_offer_locations_immutable
  BEFORE UPDATE ON offer_locations
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_offer_responsibilities_immutable
  BEFORE UPDATE ON offer_responsibilities
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_offer_capabilities_immutable
  BEFORE UPDATE ON offer_capabilities
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_offer_questions_immutable
  BEFORE UPDATE ON offer_questions
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_offer_perks_immutable
  BEFORE UPDATE ON offer_perks
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

-- Application system tables
CREATE TRIGGER protect_application_immutable
  BEFORE UPDATE ON application
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_profile_searched_immutable
  BEFORE UPDATE ON profile_searched
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

-- Credits and payment system tables
CREATE TRIGGER protect_user_credits_immutable
  BEFORE UPDATE ON user_credits
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_daily_credit_grants_immutable
  BEFORE UPDATE ON daily_credit_grants
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_credit_purchases_immutable
  BEFORE UPDATE ON credit_purchases
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_user_feedback_immutable
  BEFORE UPDATE ON user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

-- API system tables
CREATE TRIGGER protect_api_tokens_immutable
  BEFORE UPDATE ON api_tokens
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

CREATE TRIGGER protect_api_call_log_immutable
  BEFORE UPDATE ON api_call_log
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

-- Auth system tables
CREATE TRIGGER protect_signup_ip_tracking_immutable
  BEFORE UPDATE ON signup_ip_tracking
  FOR EACH ROW
  EXECUTE FUNCTION protect_immutable_columns();

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
