-- =====================================================================
-- Migration: Add Welcome Notice Tracking
-- Description: Adds has_seen_welcome_notice flag to student and company
--              tables to track first-time login notice display
-- =====================================================================

-- Add has_seen_welcome_notice column to student table
ALTER TABLE "public"."student" 
ADD COLUMN "has_seen_welcome_notice" boolean DEFAULT false;

-- Add has_seen_welcome_notice column to company table
ALTER TABLE "public"."company" 
ADD COLUMN "has_seen_welcome_notice" boolean DEFAULT false;

-- Comment the columns
COMMENT ON COLUMN "public"."student"."has_seen_welcome_notice" IS 'Tracks whether user has seen the first-time login welcome notice';
COMMENT ON COLUMN "public"."company"."has_seen_welcome_notice" IS 'Tracks whether user has seen the first-time login welcome notice';
