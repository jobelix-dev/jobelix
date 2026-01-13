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

grant delete on table "public"."api_tokens" to "anon";
grant insert on table "public"."api_tokens" to "anon";
grant references on table "public"."api_tokens" to "anon";
grant select on table "public"."api_tokens" to "anon";
grant trigger on table "public"."api_tokens" to "anon";
grant truncate on table "public"."api_tokens" to "anon";
grant update on table "public"."api_tokens" to "anon";

grant delete on table "public"."api_tokens" to "authenticated";
grant insert on table "public"."api_tokens" to "authenticated";
grant references on table "public"."api_tokens" to "authenticated";
grant select on table "public"."api_tokens" to "authenticated";
grant trigger on table "public"."api_tokens" to "authenticated";
grant truncate on table "public"."api_tokens" to "authenticated";
grant update on table "public"."api_tokens" to "authenticated";

grant delete on table "public"."api_tokens" to "service_role";
grant insert on table "public"."api_tokens" to "service_role";
grant references on table "public"."api_tokens" to "service_role";
grant select on table "public"."api_tokens" to "service_role";
grant trigger on table "public"."api_tokens" to "service_role";
grant truncate on table "public"."api_tokens" to "service_role";
grant update on table "public"."api_tokens" to "service_role";

grant delete on table "public"."api_call_log" to "anon";
grant insert on table "public"."api_call_log" to "anon";
grant references on table "public"."api_call_log" to "anon";
grant select on table "public"."api_call_log" to "anon";
grant trigger on table "public"."api_call_log" to "anon";
grant truncate on table "public"."api_call_log" to "anon";
grant update on table "public"."api_call_log" to "anon";

grant delete on table "public"."api_call_log" to "authenticated";
grant insert on table "public"."api_call_log" to "authenticated";
grant references on table "public"."api_call_log" to "authenticated";
grant select on table "public"."api_call_log" to "authenticated";
grant trigger on table "public"."api_call_log" to "authenticated";
grant truncate on table "public"."api_call_log" to "authenticated";
grant update on table "public"."api_call_log" to "authenticated";

grant delete on table "public"."api_call_log" to "service_role";
grant insert on table "public"."api_call_log" to "service_role";
grant references on table "public"."api_call_log" to "service_role";
grant select on table "public"."api_call_log" to "service_role";
grant trigger on table "public"."api_call_log" to "service_role";
grant truncate on table "public"."api_call_log" to "service_role";
grant update on table "public"."api_call_log" to "service_role";

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

create policy "api_tokens_delete_own"
on "public"."api_tokens"
as permissive
for delete
to authenticated
using ((user_id = (SELECT auth.uid())));

-- API call log policies
create policy "api_call_log_select_own"
on "public"."api_call_log"
as permissive
for select
to authenticated
using ((user_id = (SELECT auth.uid())));
