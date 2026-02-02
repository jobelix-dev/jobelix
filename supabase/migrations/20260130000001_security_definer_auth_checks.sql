-- ============================================================================
-- Migration: Security Fixes for SECURITY DEFINER Functions
-- Description: Adds authorization checks to SECURITY DEFINER functions that
--              previously allowed any authenticated user to operate on any
--              user's data. Also restricts webhook/service-only functions.
-- 
-- CRITICAL SECURITY FIXES:
-- 1. grant_daily_credits - now requires p_user_id = auth.uid()
-- 2. use_credits - now requires p_user_id = auth.uid()
-- 3. finalize_student_profile - now requires p_user_id = auth.uid()
-- 4. log_api_call - now requires p_user_id = auth.uid()
-- 5. add_purchased_credits (both versions) - now requires service_role
-- 6. update_token_last_used - now requires service_role
-- 7. update_token_usage - now requires service_role
-- ============================================================================

-- =============================================================================
-- HELPER FUNCTION: Check if called with service_role
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_service_role()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT COALESCE(current_setting('request.jwt.claims', true)::json->>'role', '') = 'service_role'
    OR COALESCE(current_setting('role', true), '') = 'service_role';
$$;

-- =============================================================================
-- FIX: grant_daily_credits - Add auth.uid() check
-- =============================================================================

CREATE OR REPLACE FUNCTION public.grant_daily_credits(p_user_id uuid)
 RETURNS TABLE(success boolean, credits_granted integer, new_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_credits_amount INTEGER := 50;
  v_new_balance INTEGER;
BEGIN
  -- SECURITY FIX: Verify user can only grant credits to themselves
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: can only grant daily credits to yourself';
  END IF;

  -- Try to insert daily grant (will fail if already claimed today)
  INSERT INTO public.daily_credit_grants (user_id, granted_date, credits_amount)
  VALUES (p_user_id, CURRENT_DATE, v_credits_amount)
  ON CONFLICT (user_id, granted_date) DO NOTHING;
  
  -- Check if we actually inserted (granted credits today)
  IF NOT FOUND THEN
    -- Already claimed today
    SELECT balance INTO v_new_balance
    FROM public.user_credits
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT FALSE, 0, COALESCE(v_new_balance, 0);
    RETURN;
  END IF;
  
  -- Add credits to balance
  INSERT INTO public.user_credits (user_id, balance, total_earned, last_updated)
  VALUES (p_user_id, v_credits_amount, v_credits_amount, now())
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_credits.balance + v_credits_amount,
    total_earned = user_credits.total_earned + v_credits_amount,
    last_updated = now()
  RETURNING user_credits.balance INTO v_new_balance;
  
  RETURN QUERY SELECT TRUE, v_credits_amount, v_new_balance;
END;
$function$;

-- =============================================================================
-- FIX: use_credits - Add auth.uid() check
-- =============================================================================

CREATE OR REPLACE FUNCTION public.use_credits(p_user_id uuid, p_amount integer DEFAULT 1)
 RETURNS TABLE(success boolean, new_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- SECURITY FIX: Verify user can only use their own credits
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: can only use your own credits';
  END IF;

  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE; -- Lock row
  
  -- Check if user has enough credits
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN QUERY SELECT FALSE, COALESCE(v_current_balance, 0);
    RETURN;
  END IF;
  
  -- Deduct credits
  UPDATE public.user_credits
  SET 
    balance = balance - p_amount,
    total_used = total_used + p_amount,
    last_updated = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  RETURN QUERY SELECT TRUE, v_new_balance;
END;
$function$;

-- =============================================================================
-- FIX: finalize_student_profile - Add auth.uid() check
-- =============================================================================

CREATE OR REPLACE FUNCTION public.finalize_student_profile(p_user_id uuid, p_profile jsonb, p_education jsonb, p_experience jsonb, p_projects jsonb, p_skills jsonb, p_languages jsonb, p_publications jsonb, p_certifications jsonb, p_social_links jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_education_count int;
  v_experience_count int;
  v_projects_count int;
  v_skills_count int;
  v_languages_count int;
  v_publications_count int;
  v_certifications_count int;
  v_social_links_count int;
BEGIN
  -- SECURITY FIX: Verify user can only finalize their own profile
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: can only finalize your own profile';
  END IF;

  -- Upsert student record
  INSERT INTO student (
    id,
    student_name,
    first_name,
    last_name,
    mail_adress,
    phone_number,
    address
  )
  VALUES (
    p_user_id,
    (p_profile->>'student_name')::text,
    (p_profile->>'first_name')::text,
    (p_profile->>'last_name')::text,
    (p_profile->>'mail_adress')::text,
    (p_profile->>'phone_number')::text,
    (p_profile->>'address')::text
  )
  ON CONFLICT (id) DO UPDATE SET
    student_name = EXCLUDED.student_name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    mail_adress = EXCLUDED.mail_adress,
    phone_number = EXCLUDED.phone_number,
    address = EXCLUDED.address;
  
  -- Delete existing related records before inserting new ones
  DELETE FROM academic WHERE student_id = p_user_id;
  DELETE FROM experience WHERE student_id = p_user_id;
  DELETE FROM project WHERE student_id = p_user_id;
  DELETE FROM skill WHERE student_id = p_user_id;
  DELETE FROM language WHERE student_id = p_user_id;
  DELETE FROM publication WHERE student_id = p_user_id;
  DELETE FROM certification WHERE student_id = p_user_id;
  DELETE FROM social_link WHERE student_id = p_user_id;
  
  -- Insert education records
  INSERT INTO academic (
    student_id,
    school_name,
    degree,
    description,
    start_year,
    start_month,
    end_year,
    end_month
  )
  SELECT 
    p_user_id,
    (elem->>'school_name')::text,
    (elem->>'degree')::text,
    (elem->>'description')::text,
    (elem->>'start_year')::int,
    (elem->>'start_month')::int,
    (elem->>'end_year')::int,
    (elem->>'end_month')::int
  FROM jsonb_array_elements(p_education) AS elem
  WHERE (elem->>'school_name')::text IS NOT NULL 
    AND (elem->>'school_name')::text != ''
    AND (elem->>'degree')::text IS NOT NULL 
    AND (elem->>'degree')::text != '';
  
  GET DIAGNOSTICS v_education_count = ROW_COUNT;
  
  -- Insert experience records
  INSERT INTO experience (
    student_id,
    organisation_name,
    position_name,
    description,
    start_year,
    start_month,
    end_year,
    end_month
  )
  SELECT 
    p_user_id,
    (elem->>'organisation_name')::text,
    (elem->>'position_name')::text,
    (elem->>'description')::text,
    (elem->>'start_year')::int,
    (elem->>'start_month')::int,
    (elem->>'end_year')::int,
    (elem->>'end_month')::int
  FROM jsonb_array_elements(p_experience) AS elem
  WHERE (elem->>'organisation_name')::text IS NOT NULL 
    AND (elem->>'organisation_name')::text != ''
    AND (elem->>'position_name')::text IS NOT NULL 
    AND (elem->>'position_name')::text != '';
  
  GET DIAGNOSTICS v_experience_count = ROW_COUNT;
  
  -- Insert project records
  INSERT INTO project (
    student_id,
    project_name,
    description,
    link
  )
  SELECT 
    p_user_id,
    (elem->>'project_name')::text,
    (elem->>'description')::text,
    (elem->>'link')::text
  FROM jsonb_array_elements(p_projects) AS elem
  WHERE (elem->>'project_name')::text IS NOT NULL 
    AND (elem->>'project_name')::text != '';
  
  GET DIAGNOSTICS v_projects_count = ROW_COUNT;
  
  -- Insert skill records
  INSERT INTO skill (
    student_id,
    skill_name,
    skill_slug
  )
  SELECT 
    p_user_id,
    (elem->>'skill_name')::text,
    (elem->>'skill_slug')::text
  FROM jsonb_array_elements(p_skills) AS elem
  WHERE (elem->>'skill_name')::text IS NOT NULL 
    AND (elem->>'skill_name')::text != ''
    AND (elem->>'skill_slug')::text IS NOT NULL 
    AND (elem->>'skill_slug')::text != '';
  
  GET DIAGNOSTICS v_skills_count = ROW_COUNT;
  
  -- Insert language records
  INSERT INTO language (
    student_id,
    language_name,
    proficiency_level
  )
  SELECT 
    p_user_id,
    (elem->>'language_name')::text,
    (elem->>'proficiency_level')::text
  FROM jsonb_array_elements(p_languages) AS elem
  WHERE (elem->>'language_name')::text IS NOT NULL 
    AND (elem->>'language_name')::text != ''
    AND (elem->>'proficiency_level')::text IS NOT NULL 
    AND (elem->>'proficiency_level')::text != '';
  
  GET DIAGNOSTICS v_languages_count = ROW_COUNT;
  
  -- Insert publication records
  INSERT INTO publication (
    student_id,
    title,
    journal_name,
    description,
    publication_year,
    publication_month,
    link
  )
  SELECT 
    p_user_id,
    (elem->>'title')::text,
    (elem->>'journal_name')::text,
    (elem->>'description')::text,
    (elem->>'publication_year')::int,
    (elem->>'publication_month')::int,
    (elem->>'link')::text
  FROM jsonb_array_elements(p_publications) AS elem
  WHERE (elem->>'title')::text IS NOT NULL 
    AND (elem->>'title')::text != '';
  
  GET DIAGNOSTICS v_publications_count = ROW_COUNT;
  
  -- Insert certification records
  INSERT INTO certification (
    student_id,
    name,
    issuing_organization,
    url
  )
  SELECT 
    p_user_id,
    (elem->>'name')::text,
    (elem->>'issuing_organization')::text,
    (elem->>'url')::text
  FROM jsonb_array_elements(p_certifications) AS elem
  WHERE (elem->>'name')::text IS NOT NULL 
    AND (elem->>'name')::text != '';
  
  GET DIAGNOSTICS v_certifications_count = ROW_COUNT;
  
  -- Insert social link record (NEW: platform-specific columns)
  -- p_social_links is now an object: {github: "url", linkedin: "url", stackoverflow: "url", kaggle: "url", leetcode: "url"}
  IF p_social_links IS NOT NULL AND jsonb_typeof(p_social_links) = 'object' THEN
    -- Check if at least one platform has a value
    IF (p_social_links->>'github') IS NOT NULL 
       OR (p_social_links->>'linkedin') IS NOT NULL
       OR (p_social_links->>'stackoverflow') IS NOT NULL
       OR (p_social_links->>'kaggle') IS NOT NULL
       OR (p_social_links->>'leetcode') IS NOT NULL
    THEN
      INSERT INTO social_link (
        student_id,
        github,
        linkedin,
        stackoverflow,
        kaggle,
        leetcode
      )
      VALUES (
        p_user_id,
        NULLIF(TRIM(p_social_links->>'github'), ''),
        NULLIF(TRIM(p_social_links->>'linkedin'), ''),
        NULLIF(TRIM(p_social_links->>'stackoverflow'), ''),
        NULLIF(TRIM(p_social_links->>'kaggle'), ''),
        NULLIF(TRIM(p_social_links->>'leetcode'), '')
      );
      
      v_social_links_count := 1;
    ELSE
      v_social_links_count := 0;
    END IF;
  ELSE
    v_social_links_count := 0;
  END IF;
  
  -- Return success with counts
  RETURN jsonb_build_object(
    'success', true,
    'education_count', v_education_count,
    'experience_count', v_experience_count,
    'projects_count', v_projects_count,
    'skills_count', v_skills_count,
    'languages_count', v_languages_count,
    'publications_count', v_publications_count,
    'certifications_count', v_certifications_count,
    'social_links_count', v_social_links_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$function$;

-- =============================================================================
-- FIX: log_api_call - Add auth.uid() check
-- =============================================================================

CREATE OR REPLACE FUNCTION public.log_api_call(p_user_id uuid, p_endpoint text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_log_id UUID;
BEGIN
  -- SECURITY FIX: Verify user can only log calls for themselves
  -- Allow service_role to log for any user (needed for server-side operations)
  IF NOT public.is_service_role() AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: can only log API calls for yourself';
  END IF;

  INSERT INTO api_call_log (user_id, endpoint)
  VALUES (p_user_id, p_endpoint)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$function$;

-- =============================================================================
-- FIX: add_purchased_credits (legacy 5-param version) - Require service_role
-- =============================================================================

CREATE OR REPLACE FUNCTION public.add_purchased_credits(p_user_id uuid, p_credits integer, p_amount_cents integer, p_stripe_event_id text DEFAULT NULL::text, p_stripe_session_id text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- SECURITY FIX: This function should only be called from server-side (webhooks)
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Unauthorized: service role required for credit purchases';
  END IF;

  -- Insert purchase record (will fail if event_id or session_id already exists)
  INSERT INTO public.credit_purchases (
    user_id, 
    credits_amount, 
    price_cents, 
    stripe_event_id, 
    stripe_checkout_session_id
  )
  VALUES (
    p_user_id, 
    p_credits, 
    p_amount_cents, 
    p_stripe_event_id, 
    p_stripe_session_id
  );

  -- Add credits to user balance
  UPDATE public.user_credits
  SET 
    balance = balance + p_credits,
    total_purchased = total_purchased + p_credits
  WHERE user_id = p_user_id;

  -- Create user_credits row if it doesn't exist
  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, balance, total_purchased)
    VALUES (p_user_id, p_credits, p_credits);
  END IF;
END;
$function$;

-- =============================================================================
-- FIX: add_purchased_credits (full 7-param version) - Require service_role
-- =============================================================================

CREATE OR REPLACE FUNCTION public.add_purchased_credits(p_user_id uuid, p_credits_amount integer, p_payment_intent_id text, p_stripe_event_id text, p_session_id text, p_amount_cents integer, p_currency text)
 RETURNS TABLE(success boolean, new_balance integer, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_balance INTEGER;
  v_purchase_id UUID;
BEGIN
  -- SECURITY FIX: This function should only be called from server-side (webhooks)
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Unauthorized: service role required for credit purchases';
  END IF;

  -- SECURITY: Check if this event was already processed (idempotency)
  -- This check happens INSIDE the transaction with row lock
  SELECT id INTO v_purchase_id
  FROM public.credit_purchases
  WHERE stripe_event_id = p_stripe_event_id
  FOR UPDATE NOWAIT; -- Lock immediately or fail
  
  IF v_purchase_id IS NOT NULL THEN
    -- Event already processed
    SELECT balance INTO v_new_balance
    FROM public.user_credits
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT TRUE, COALESCE(v_new_balance, 0), 'Already processed'::TEXT;
    RETURN;
  END IF;

  -- Check by session ID as backup
  SELECT id INTO v_purchase_id
  FROM public.credit_purchases
  WHERE stripe_checkout_session_id = p_session_id
    AND status = 'completed'
  FOR UPDATE NOWAIT;
  
  IF v_purchase_id IS NOT NULL THEN
    -- Session already completed
    SELECT balance INTO v_new_balance
    FROM public.user_credits
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT TRUE, COALESCE(v_new_balance, 0), 'Session already completed'::TEXT;
    RETURN;
  END IF;

  -- ATOMIC OPERATION: Update purchase record AND add credits in same transaction
  
  -- Step 1: Update purchase record to completed
  UPDATE public.credit_purchases
  SET 
    stripe_payment_intent_id = p_payment_intent_id,
    stripe_event_id = p_stripe_event_id,
    price_cents = p_amount_cents,
    currency = p_currency,
    status = 'completed',
    completed_at = now()
  WHERE stripe_checkout_session_id = p_session_id
    AND status = 'pending'
  RETURNING id INTO v_purchase_id;
  
  IF v_purchase_id IS NULL THEN
    -- Purchase not found or already processed
    RETURN QUERY SELECT FALSE, 0, 'Purchase not found or already completed'::TEXT;
    RETURN;
  END IF;

  -- Step 2: Add credits to user balance
  INSERT INTO public.user_credits (user_id, balance, total_purchased, last_updated)
  VALUES (p_user_id, p_credits_amount, p_credits_amount, now())
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_credits.balance + p_credits_amount,
    total_purchased = user_credits.total_purchased + p_credits_amount,
    last_updated = now()
  RETURNING user_credits.balance INTO v_new_balance;
  
  -- Success
  RETURN QUERY SELECT TRUE, v_new_balance, 'Credits added successfully'::TEXT;
  
EXCEPTION
  WHEN lock_not_available THEN
    -- Another process is currently processing this event
    RETURN QUERY SELECT FALSE, 0, 'Event is being processed by another request'::TEXT;
  WHEN unique_violation THEN
    -- Event ID already exists (race condition caught)
    SELECT balance INTO v_new_balance
    FROM public.user_credits
    WHERE user_id = p_user_id;
    RETURN QUERY SELECT TRUE, COALESCE(v_new_balance, 0), 'Event already processed (caught by constraint)'::TEXT;
END;
$function$;

-- =============================================================================
-- FIX: update_token_last_used - Require service_role
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_token_last_used(p_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- SECURITY FIX: This function should only be called from server-side
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Unauthorized: service role required for token operations';
  END IF;

  UPDATE public.api_tokens
  SET last_used_at = now()
  WHERE token = p_token;
END;
$function$;

-- =============================================================================
-- FIX: update_token_usage - Require service_role
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_token_usage(p_token text, p_tokens_used integer, p_cost_usd numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- SECURITY FIX: This function should only be called from server-side
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
$function$;

-- =============================================================================
-- COMMENTS: Document the security requirements
-- =============================================================================

COMMENT ON FUNCTION public.grant_daily_credits(uuid) IS 
'Grants daily free credits to a user. SECURITY: User can only grant credits to themselves (p_user_id must equal auth.uid()).';

COMMENT ON FUNCTION public.use_credits(uuid, integer) IS 
'Deducts credits from a user balance. SECURITY: User can only use their own credits (p_user_id must equal auth.uid()).';

COMMENT ON FUNCTION public.finalize_student_profile(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) IS 
'Transforms draft profile data into normalized tables. SECURITY: User can only finalize their own profile (p_user_id must equal auth.uid()).';

COMMENT ON FUNCTION public.log_api_call(uuid, text) IS 
'Logs an API call for rate limiting. SECURITY: User can only log calls for themselves unless called with service_role.';

COMMENT ON FUNCTION public.add_purchased_credits(uuid, integer, integer, text, text) IS 
'Legacy function to add purchased credits. SECURITY: Requires service_role (webhook/server-side only).';

COMMENT ON FUNCTION public.add_purchased_credits(uuid, integer, text, text, text, integer, text) IS 
'Full function to add purchased credits with idempotency. SECURITY: Requires service_role (webhook/server-side only).';

COMMENT ON FUNCTION public.update_token_last_used(text) IS 
'Updates API token last_used_at timestamp. SECURITY: Requires service_role (server-side only).';

COMMENT ON FUNCTION public.update_token_usage(text, integer, numeric) IS 
'Updates API token usage statistics. SECURITY: Requires service_role (server-side only).';

COMMENT ON FUNCTION public.is_service_role() IS 
'Helper function to check if the current request is using service_role. Used for authorization in SECURITY DEFINER functions.';
