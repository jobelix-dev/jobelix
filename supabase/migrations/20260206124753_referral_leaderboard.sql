-- =============================================================================
-- REFERRAL LEADERBOARD
-- =============================================================================
-- Provides a public leaderboard of top referrers for gamification.
-- Shows anonymized first names and referral counts.
-- 
-- Privacy considerations:
-- - Only shows first name (not full name or email)
-- - Only shows users who have at least 1 completed referral
-- - User can see their own rank even if not in top N
-- =============================================================================

-- =============================================================================
-- FUNCTION: get_referral_leaderboard
-- =============================================================================
-- Returns top N referrers by completed referrals
-- Includes current user's rank if they have referrals
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
BEGIN
  v_user_id := auth.uid();
  
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
  WHERE rn <= p_limit
  ORDER BY rn;
END;
$$;

-- =============================================================================
-- FUNCTION: get_my_leaderboard_rank
-- =============================================================================
-- Returns current user's rank on the leaderboard (if they have referrals)
-- Useful for showing "You are #X" when user is not in top N
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

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
  ),
  totals AS (
    SELECT COUNT(*)::INTEGER AS total FROM ranked
  )
  SELECT 
    rn::INTEGER AS rank,
    completed::INTEGER AS completed_count,
    credits::INTEGER AS total_credits_earned,
    (SELECT total FROM totals) AS total_participants
  FROM ranked
  WHERE referrer_id = v_user_id;

  -- If user has no completed referrals, return NULL row
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::INTEGER, 0, 0, 
      (SELECT COUNT(*)::INTEGER FROM public.referrals WHERE status = 'completed' GROUP BY referrer_id HAVING COUNT(*) > 0);
  END IF;
END;
$$;

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.get_referral_leaderboard(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_leaderboard_rank() TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION public.get_referral_leaderboard(INTEGER) IS 'Returns top N referrers for the leaderboard. Shows first name and completed referral count.';
COMMENT ON FUNCTION public.get_my_leaderboard_rank() IS 'Returns current user''s rank on the referral leaderboard.';
