-- ============================================================================
-- Migration: 06 - API Tokens and Call Logging
-- Description: API token management for external integrations, call logging
--              for rate limiting, and usage tracking
-- ============================================================================

-- =============================================================================
-- TABLES
-- =============================================================================

-- API tokens: Authentication tokens for external API access
create table "public"."api_tokens" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid not null,
  "token" text not null,
  "last_used_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "total_tokens_used" bigint not null default 0,
  "total_cost_usd" numeric(10,6) not null default 0
);

alter table "public"."api_tokens" enable row level security;

-- API call log: Track API usage for rate limiting
create table "public"."api_call_log" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid not null,
  "endpoint" text not null,
  "created_at" timestamp with time zone not null default now()
);

alter table "public"."api_call_log" enable row level security;

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_api_tokens_user ON public.api_tokens USING btree (user_id);
CREATE INDEX idx_api_tokens_token ON public.api_tokens USING btree (token);
CREATE INDEX idx_api_call_log_user_endpoint ON public.api_call_log USING btree (user_id, endpoint, created_at);
CREATE INDEX idx_api_call_log_created_at ON public.api_call_log USING btree (created_at);

CREATE UNIQUE INDEX api_tokens_pkey ON public.api_tokens USING btree (id);
CREATE UNIQUE INDEX api_tokens_token_key ON public.api_tokens USING btree (token);
CREATE UNIQUE INDEX api_tokens_user_id_key ON public.api_tokens USING btree (user_id);
CREATE UNIQUE INDEX api_call_log_pkey ON public.api_call_log USING btree (id);

-- =============================================================================
-- PRIMARY KEYS
-- =============================================================================

alter table "public"."api_tokens" add constraint "api_tokens_pkey" PRIMARY KEY using index "api_tokens_pkey";
alter table "public"."api_call_log" add constraint "api_call_log_pkey" PRIMARY KEY using index "api_call_log_pkey";

-- =============================================================================
-- CONSTRAINTS
-- =============================================================================

alter table "public"."api_tokens" add constraint "api_tokens_token_key" UNIQUE using index "api_tokens_token_key";
alter table "public"."api_tokens" add constraint "api_tokens_user_id_key" UNIQUE using index "api_tokens_user_id_key";

-- =============================================================================
-- FOREIGN KEYS
-- =============================================================================

alter table "public"."api_tokens" add constraint "api_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;
alter table "public"."api_tokens" validate constraint "api_tokens_user_id_fkey";

alter table "public"."api_call_log" add constraint "api_call_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;
alter table "public"."api_call_log" validate constraint "api_call_log_user_id_fkey";

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

set check_function_bodies = off;

-- Log an API call for rate limiting tracking
CREATE OR REPLACE FUNCTION public.log_api_call(p_user_id uuid, p_endpoint text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_log_id UUID;
BEGIN
  -- SECURITY: Verify user can only log calls for themselves
  -- Allow service_role to log for any user (needed for server-side operations)
  IF NOT public.is_service_role() AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: can only log API calls for yourself';
  END IF;

  INSERT INTO api_call_log (user_id, endpoint)
  VALUES (p_user_id, p_endpoint)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$function$
;

-- Check API rate limit for a user and endpoint
CREATE OR REPLACE FUNCTION public.check_api_rate_limit(p_user_id uuid, p_endpoint text, p_hourly_limit integer DEFAULT 100, p_daily_limit integer DEFAULT 500)
 RETURNS TABLE(allowed boolean, hourly_count bigint, daily_count bigint, hourly_remaining integer, daily_remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hourly_count BIGINT;
  v_daily_count BIGINT;
BEGIN
  -- Count calls in the last hour
  SELECT COUNT(*) INTO v_hourly_count
  FROM api_call_log
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND created_at > NOW() - INTERVAL '1 hour';

  -- Count calls in the last 24 hours
  SELECT COUNT(*) INTO v_daily_count
  FROM api_call_log
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND created_at > NOW() - INTERVAL '24 hours';

  -- Return results
  RETURN QUERY SELECT
    (v_hourly_count < p_hourly_limit AND v_daily_count < p_daily_limit) AS allowed,
    v_hourly_count AS hourly_count,
    v_daily_count AS daily_count,
    (p_hourly_limit - v_hourly_count::INT) AS hourly_remaining,
    (p_daily_limit - v_daily_count::INT) AS daily_remaining;
END;
$function$
;

-- Cleanup old API logs (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_api_logs()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted_count BIGINT;
BEGIN
  DELETE FROM api_call_log
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$function$
;

-- Update token last used timestamp
CREATE OR REPLACE FUNCTION public.update_token_last_used(p_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- SECURITY: This function should only be called from server-side
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Unauthorized: service role required for token operations';
  END IF;

  UPDATE public.api_tokens
  SET last_used_at = now()
  WHERE token = p_token;
END;
$function$
;

-- Update token usage statistics
CREATE OR REPLACE FUNCTION public.update_token_usage(p_token text, p_tokens_used integer, p_cost_usd numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- SECURITY: This function should only be called from server-side
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Unauthorized: service role required for token operations';
  END IF;

  UPDATE public.api_tokens
  SET 
    total_tokens_used = total_tokens_used + p_tokens_used,
    total_cost_usd = total_cost_usd + p_cost_usd,
    last_used_at = now()
  WHERE token = p_token;
END;
$function$
;

-- Get user total cost (legacy function)
CREATE OR REPLACE FUNCTION public.get_user_total_cost(user_uuid uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(total_cost), 0.00)
  FROM gpt_tokens
  WHERE user_id = user_uuid;
$function$
;

-- =============================================================================
-- GRANTS
-- =============================================================================
-- anon: SELECT only (no write access)
-- authenticated: SELECT, INSERT, UPDATE, DELETE (RLS handles authorization)
-- service_role: full access (bypasses RLS by design)

GRANT SELECT ON TABLE "public"."api_tokens" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."api_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."api_tokens" TO "service_role";

GRANT SELECT ON TABLE "public"."api_call_log" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."api_call_log" TO "authenticated";
GRANT ALL ON TABLE "public"."api_call_log" TO "service_role";

-- Function grants: restrict SECURITY DEFINER functions from default PUBLIC access

-- log_api_call(uuid, text) - authenticated + service_role (users log their own calls)
REVOKE EXECUTE ON FUNCTION public.log_api_call(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.log_api_call(uuid, text) TO authenticated, service_role;

-- check_api_rate_limit(uuid, text, integer, integer) - service_role only (server-side)
REVOKE EXECUTE ON FUNCTION public.check_api_rate_limit(uuid, text, integer, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_api_rate_limit(uuid, text, integer, integer) TO service_role;

-- cleanup_old_api_logs() - service_role only (cron/admin)
REVOKE EXECUTE ON FUNCTION public.cleanup_old_api_logs() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_api_logs() TO service_role;

-- update_token_last_used(text) - service_role only
REVOKE EXECUTE ON FUNCTION public.update_token_last_used(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_token_last_used(text) TO service_role;

-- update_token_usage(text, integer, numeric) - service_role only
REVOKE EXECUTE ON FUNCTION public.update_token_usage(text, integer, numeric) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_token_usage(text, integer, numeric) TO service_role;

-- get_user_total_cost(uuid) - service_role only (admin/legacy function)
REVOKE EXECUTE ON FUNCTION public.get_user_total_cost(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_total_cost(uuid) TO service_role;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- API tokens policies
create policy "api_tokens_select_own"
on "public"."api_tokens"
as permissive
for select
to authenticated
using ((user_id = (SELECT auth.uid())));

-- Users are not allowed to delete/insert their own API tokens for the moment
-- create policy "api_tokens_delete_own"
-- on "public"."api_tokens"
-- as permissive
-- for delete
-- to authenticated
-- using ((user_id = (SELECT auth.uid())));

-- API call log policies
create policy "api_call_log_select_own"
on "public"."api_call_log"
as permissive
for select
to authenticated
using ((user_id = (SELECT auth.uid())));
