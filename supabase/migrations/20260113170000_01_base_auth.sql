-- Migration 01: Base Authentication and IP Tracking
-- Purpose: Foundation tables for user management and signup abuse prevention
-- Dependencies: None (requires Supabase Auth schema)

-- Drop pg_net extension if it exists (not needed for core functionality)
DROP EXTENSION IF EXISTS "pg_net";

-- ============================================================================
-- IP Tracking for Signup Abuse Prevention
-- ============================================================================

CREATE TABLE "public"."signup_ip_tracking" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "ip_address" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "user_agent" text
);

ALTER TABLE "public"."signup_ip_tracking" ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX signup_ip_tracking_pkey ON public.signup_ip_tracking USING btree (id);
CREATE INDEX signup_ip_tracking_created_at_idx ON public.signup_ip_tracking USING btree (created_at);
CREATE INDEX signup_ip_tracking_ip_address_idx ON public.signup_ip_tracking USING btree (ip_address);

ALTER TABLE "public"."signup_ip_tracking" 
  ADD CONSTRAINT "signup_ip_tracking_pkey" PRIMARY KEY USING INDEX "signup_ip_tracking_pkey";

-- ============================================================================
-- Utility Functions for Authentication
-- ============================================================================

-- Cleanup old IP tracking records (30 days retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_ip_tracking()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    DELETE FROM signup_ip_tracking
    WHERE created_at < (now() - interval '30 days');
END;
$function$;

-- Count recent signups from an IP address (rate limiting check)
CREATE OR REPLACE FUNCTION public.count_recent_signups_from_ip(p_ip_address text, p_hours_ago integer DEFAULT 24)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    signup_count int;
BEGIN
    SELECT COUNT(*)
    INTO signup_count
    FROM signup_ip_tracking
    WHERE ip_address = p_ip_address
    AND created_at > (now() - (p_hours_ago || ' hours')::interval);
    
    RETURN signup_count;
END;
$function$;

-- ============================================================================
-- New User Trigger Handler (creates student/company + API token)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  user_role TEXT;
  v_token TEXT;
BEGIN
  user_role := NEW.raw_user_meta_data ->> 'role';

  -- Create student or company record based on role
  IF user_role = 'student' THEN
    INSERT INTO public.student (id, mail_adress)
    VALUES (NEW.id, NEW.email);
  ELSIF user_role = 'company' THEN
    INSERT INTO public.company (id, mail_adress)
    VALUES (NEW.id, NEW.email);
  END IF;

  -- Generate API token for external bot access
  v_token := encode(gen_random_bytes(32), 'base64');
  INSERT INTO public.api_tokens (user_id, token)
  VALUES (NEW.id, v_token);

  RETURN NEW;
END;
$function$;

-- Create trigger on auth.users (Supabase Auth schema)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- RLS Policies for IP Tracking
-- ============================================================================

-- No public access to IP tracking (service_role only)
-- RLS is enabled but no policies created - only server-side access

-- Grant permissions
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE 
  ON TABLE "public"."signup_ip_tracking" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE 
  ON TABLE "public"."signup_ip_tracking" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE 
  ON TABLE "public"."signup_ip_tracking" TO "service_role";
