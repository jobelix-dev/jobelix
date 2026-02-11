-- =============================================================================
-- REFERRAL SYSTEM BUGFIXES
-- =============================================================================
-- Fixes identified during code audit:
-- 1. complete_pending_referral() - Add security to prevent external calls
-- 2. get_my_leaderboard_rank() - Fix total_participants query
-- 3. apply_referral_code() - Handle race condition with unique violation
-- 4. get_referral_leaderboard() - Add limit validation
-- =============================================================================

-- =============================================================================
-- FIX 1: Revoke direct access to complete_pending_referral()
-- =============================================================================
-- This function should only be called internally by use_credits().
-- Revoking access prevents any external calls from authenticated users.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.complete_pending_referral(UUID) FROM authenticated, anon, public;

-- =============================================================================
-- FIX 2: Fix get_my_leaderboard_rank() total_participants query
-- =============================================================================
-- The original query used GROUP BY without proper COUNT wrapper, returning
-- multiple rows instead of a count.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_leaderboard_rank()
RETURNS TABLE(
  rank INTEGER,
  completed_count INTEGER,
  total_credits_earned INTEGER,
  total_participants INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_total_participants INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Calculate total participants first
  SELECT COUNT(DISTINCT referrer_id)::INTEGER INTO v_total_participants
  FROM public.referrals 
  WHERE status = 'completed';

  RETURN QUERY
  WITH referrer_stats AS (
    SELECT 
      r.referrer_id,
      COUNT(*) FILTER (WHERE r.status = 'completed') AS completed,
      COALESCE(SUM(r.referrer_credits) FILTER (WHERE r.status = 'completed'), 0) AS credits
    FROM public.referrals r
    GROUP BY r.referrer_id
    HAVING COUNT(*) FILTER (WHERE r.status = 'completed') > 0
  ),
  ranked AS (
    SELECT 
      rs.referrer_id,
      rs.completed,
      rs.credits,
      ROW_NUMBER() OVER (ORDER BY rs.completed DESC, rs.credits DESC, rs.referrer_id) AS rn
    FROM referrer_stats rs
  )
  SELECT 
    rn::INTEGER AS rank,
    completed::INTEGER AS completed_count,
    credits::INTEGER AS total_credits_earned,
    v_total_participants AS total_participants
  FROM ranked
  WHERE referrer_id = v_user_id;

  -- If user has no completed referrals, return NULL rank with total participants
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::INTEGER, 0, 0, v_total_participants;
  END IF;
END;
$$;

-- =============================================================================
-- FIX 3: Fix apply_referral_code() race condition
-- =============================================================================
-- Add exception handling for unique constraint violation to handle concurrent
-- requests gracefully instead of returning a 500 error.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.apply_referral_code(p_code TEXT)
RETURNS TABLE(success BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_referrer_id UUID;
  v_normalized_code TEXT;
  v_user_created_at TIMESTAMPTZ;
  v_is_student BOOLEAN;
  v_referrer_is_student BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Not authenticated'::TEXT;
    RETURN;
  END IF;
  
  -- Check if user is a student
  SELECT EXISTS (SELECT 1 FROM public.student WHERE id = v_user_id) INTO v_is_student;
  IF NOT v_is_student THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired referral code'::TEXT;
    RETURN;
  END IF;
  
  -- Get user's creation timestamp for time limit check
  SELECT created_at INTO v_user_created_at
  FROM auth.users
  WHERE id = v_user_id;
  
  -- Check 7-day time limit
  IF v_user_created_at IS NULL OR (now() - v_user_created_at) > INTERVAL '7 days' THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired referral code'::TEXT;
    RETURN;
  END IF;
  
  -- Normalize code to lowercase
  v_normalized_code := lower(trim(p_code));
  
  -- Validate code format
  IF v_normalized_code !~ '^[a-z0-9]{8}$' THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired referral code'::TEXT;
    RETURN;
  END IF;
  
  -- Check if user was already referred (before attempting insert)
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referee_id = v_user_id) THEN
    RETURN QUERY SELECT FALSE, 'You have already used a referral code'::TEXT;
    RETURN;
  END IF;
  
  -- Find the referrer by code
  SELECT rc.user_id INTO v_referrer_id
  FROM public.referral_codes rc
  WHERE rc.code = v_normalized_code;
  
  IF v_referrer_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired referral code'::TEXT;
    RETURN;
  END IF;
  
  -- Check if referrer is a student
  SELECT EXISTS (SELECT 1 FROM public.student WHERE id = v_referrer_id) INTO v_referrer_is_student;
  IF NOT v_referrer_is_student THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired referral code'::TEXT;
    RETURN;
  END IF;
  
  -- Prevent self-referral (return same generic message)
  IF v_referrer_id = v_user_id THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired referral code'::TEXT;
    RETURN;
  END IF;
  
  -- Create the pending referral with exception handling for race condition
  BEGIN
    INSERT INTO public.referrals (referrer_id, referee_id, referral_code, status)
    VALUES (v_referrer_id, v_user_id, v_normalized_code, 'pending');
  EXCEPTION 
    WHEN unique_violation THEN
      -- Another concurrent request already inserted - return friendly message
      RETURN QUERY SELECT FALSE, 'You have already used a referral code'::TEXT;
      RETURN;
  END;
  
  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- =============================================================================
-- FIX 4: Add limit validation to get_referral_leaderboard()
-- =============================================================================
-- Prevent abuse by limiting the maximum number of results to 100.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_referral_leaderboard(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  rank INTEGER,
  first_name TEXT,
  completed_count INTEGER,
  total_credits_earned INTEGER,
  is_current_user BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_safe_limit INTEGER;
BEGIN
  v_user_id := auth.uid();
  
  -- Validate and cap the limit (1-100)
  v_safe_limit := GREATEST(1, LEAST(COALESCE(p_limit, 10), 100));
  
  -- Return top referrers with their stats
  RETURN QUERY
  WITH referrer_stats AS (
    SELECT 
      r.referrer_id,
      COUNT(*) FILTER (WHERE r.status = 'completed') AS completed,
      COALESCE(SUM(r.referrer_credits) FILTER (WHERE r.status = 'completed'), 0) AS credits
    FROM public.referrals r
    GROUP BY r.referrer_id
    HAVING COUNT(*) FILTER (WHERE r.status = 'completed') > 0
  ),
  ranked AS (
    SELECT 
      rs.referrer_id,
      rs.completed,
      rs.credits,
      COALESCE(s.first_name, 'Anonymous') AS fname,
      ROW_NUMBER() OVER (ORDER BY rs.completed DESC, rs.credits DESC, rs.referrer_id) AS rn
    FROM referrer_stats rs
    LEFT JOIN public.student s ON s.id = rs.referrer_id
  )
  SELECT 
    rn::INTEGER AS rank,
    fname AS first_name,
    completed::INTEGER AS completed_count,
    credits::INTEGER AS total_credits_earned,
    (referrer_id = v_user_id) AS is_current_user
  FROM ranked
  WHERE rn <= v_safe_limit
  ORDER BY rn;
END;
$$;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION public.get_my_leaderboard_rank() IS 'Returns current user''s rank on the referral leaderboard. Fixed to correctly count total participants.';
COMMENT ON FUNCTION public.apply_referral_code(TEXT) IS 'Associates a referral code with the current user. Handles race conditions gracefully.';
COMMENT ON FUNCTION public.get_referral_leaderboard(INTEGER) IS 'Returns top N referrers for the leaderboard. Limit is capped at 100.';
