-- Migration 08: Indexes and Triggers (Performance Layer)
-- Purpose: Optimize query performance and maintain data consistency
-- Dependencies: All table migrations (01-06)
-- Note: Individual table indexes are already created in their migrations
--       This file is for performance optimizations added after initial deployment

set check_function_bodies = off;

-- ============================================================================
-- Protection Function: Prevent updates to critical Stripe idempotency keys
-- ============================================================================
-- Note: Database constraints already protect PKs, FKs, and unique constraints.
-- This trigger focuses on preventing accidental Stripe payment duplicates.

CREATE OR REPLACE FUNCTION public.protect_stripe_idempotency()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only protect Stripe idempotency keys to prevent duplicate payments
  -- Once these are set (not NULL), they should never change
  IF OLD.stripe_event_id IS DISTINCT FROM NEW.stripe_event_id AND OLD.stripe_event_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot update Stripe idempotency key: stripe_event_id';
  END IF;
  
  IF OLD.stripe_payment_intent_id IS DISTINCT FROM NEW.stripe_payment_intent_id AND OLD.stripe_payment_intent_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot update Stripe idempotency key: stripe_payment_intent_id';
  END IF;
  
  IF OLD.stripe_checkout_session_id IS DISTINCT FROM NEW.stripe_checkout_session_id AND OLD.stripe_checkout_session_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot update Stripe idempotency key: stripe_checkout_session_id';
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
-- Stripe Idempotency Protection Trigger
-- ============================================================================

-- Only protect credit_purchases table from Stripe idempotency key changes
CREATE TRIGGER protect_stripe_idempotency_trigger
  BEFORE UPDATE ON credit_purchases
  FOR EACH ROW
  EXECUTE FUNCTION protect_stripe_idempotency();

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
