-- =============================================================================
-- REFERRAL TRACKING FEATURES
-- =============================================================================
-- 1. get_my_referral_status(): For referees to see their pending bonus
-- 2. get_my_referrals(): For referrers to see who they referred with names
-- =============================================================================

-- =============================================================================
-- FUNCTION: get_my_referral_status
-- =============================================================================
-- Returns the current user's status as a referee (were they referred?)
-- Used to show the "You have 50 bonus credits waiting" banner
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_referral_status()
RETURNS TABLE(
  is_referred BOOLEAN,
  status TEXT,
  bonus_credits INTEGER,
  referrer_first_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    TRUE AS is_referred,
    r.status,
    r.referee_credits AS bonus_credits,
    s.first_name AS referrer_first_name
  FROM public.referrals r
  LEFT JOIN public.student s ON s.id = r.referrer_id
  WHERE r.referee_id = v_user_id
  LIMIT 1;

  -- If no rows returned, return default "not referred" state
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::INTEGER, NULL::TEXT;
  END IF;
END;
$$;

-- =============================================================================
-- FUNCTION: get_my_referrals
-- =============================================================================
-- Returns list of users the current user has referred
-- Includes first name from student table for display
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_referrals()
RETURNS TABLE(
  id UUID,
  first_name TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  credits_earned INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user is a student (only students can have referrals)
  IF NOT EXISTS (SELECT 1 FROM public.student WHERE student.id = v_user_id) THEN
    RAISE EXCEPTION 'Referrals are only available for talent accounts';
  END IF;

  RETURN QUERY
  SELECT 
    r.id,
    COALESCE(s.first_name, 'Friend') AS first_name,
    r.status,
    r.created_at,
    r.completed_at,
    CASE WHEN r.status = 'completed' THEN r.referrer_credits ELSE 0 END AS credits_earned
  FROM public.referrals r
  LEFT JOIN public.student s ON s.id = r.referee_id
  WHERE r.referrer_id = v_user_id
  ORDER BY 
    -- Pending first, then by date (newest first)
    CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END,
    r.created_at DESC;
END;
$$;

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.get_my_referral_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_referrals() TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION public.get_my_referral_status() IS 'Returns the current user''s referral status as a referee. Used to show the bonus credits banner.';
COMMENT ON FUNCTION public.get_my_referrals() IS 'Returns list of users the current user has referred, with first names for display.';
