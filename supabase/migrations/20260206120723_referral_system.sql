-- =============================================================================
-- REFERRAL SYSTEM (CONSOLIDATED)
-- =============================================================================
-- Allows users to invite friends and earn credits when they start using the bot.
-- 
-- Flow:
-- 1. User A shares their referral code (8-char alphanumeric)
-- 2. User B signs up with ?ref=CODE query param
-- 3. User B runs the bot for the first time (uses credits)
-- 4. Both users receive credits (200 for referrer, 50 for referee)
--
-- Security:
-- - No self-referrals (database constraint)
-- - One referral per user (unique constraint on referee_id)
-- - Students only (both referrer and referee must be students)
-- - 7-day time limit for applying referral codes
-- - All credit grants via SECURITY DEFINER functions
-- - RLS: Users can only view their own data
-- - Generic error messages to prevent enumeration
-- =============================================================================

-- =============================================================================
-- TABLES
-- =============================================================================

-- User's personal referral code
CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT referral_codes_code_unique UNIQUE (code),
  CONSTRAINT referral_codes_code_format CHECK (code ~ '^[a-z0-9]{8}$')
);

-- Referral relationships and status
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- The referrer (existing user who shared the code)
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- The referee (new user who signed up with the code)
  referee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- The code used (denormalized for audit trail)
  referral_code TEXT NOT NULL,
  
  -- Status: pending (signed up) → completed (ran bot, credits granted)
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Credit amounts (stored for audit trail, allows future changes)
  referrer_credits INTEGER NOT NULL DEFAULT 200,
  referee_credits INTEGER NOT NULL DEFAULT 50,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT referrals_referee_unique UNIQUE (referee_id),
  CONSTRAINT referrals_no_self_referral CHECK (referrer_id != referee_id),
  CONSTRAINT referrals_status_valid CHECK (status IN ('pending', 'completed'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_pending ON public.referrals(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Referral codes: users can only view their own code
DROP POLICY IF EXISTS "referral_codes_select_own" ON public.referral_codes;
CREATE POLICY "referral_codes_select_own" ON public.referral_codes
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- Referrals: users can view referrals where they are the referrer
DROP POLICY IF EXISTS "referrals_select_as_referrer" ON public.referrals;
CREATE POLICY "referrals_select_as_referrer" ON public.referrals
  FOR SELECT USING (referrer_id = (SELECT auth.uid()));

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Generate a random 8-character lowercase alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- =============================================================================
-- CORE FUNCTIONS
-- =============================================================================

-- Get or create a referral code for the current user (students only)
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS TABLE(code TEXT, created BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_code TEXT;
  v_attempts INTEGER := 0;
  v_max_attempts INTEGER := 10;
  v_is_student BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if user is a student
  SELECT EXISTS (SELECT 1 FROM public.student WHERE id = v_user_id) INTO v_is_student;
  IF NOT v_is_student THEN
    RAISE EXCEPTION 'Referral codes are only available for talent accounts';
  END IF;
  
  -- Check if user already has a code
  SELECT rc.code INTO v_code
  FROM public.referral_codes rc
  WHERE rc.user_id = v_user_id;
  
  IF v_code IS NOT NULL THEN
    RETURN QUERY SELECT v_code, FALSE;
    RETURN;
  END IF;
  
  -- Generate a unique code (retry on collision)
  LOOP
    v_code := generate_referral_code();
    v_attempts := v_attempts + 1;
    
    BEGIN
      INSERT INTO public.referral_codes (user_id, code)
      VALUES (v_user_id, v_code);
      
      RETURN QUERY SELECT v_code, TRUE;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempts >= v_max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique referral code after % attempts', v_max_attempts;
      END IF;
    END;
  END LOOP;
END;
$$;

-- Apply a referral code to the current user
-- Security: students only, 7-day limit, generic errors, race condition handling
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
      RETURN QUERY SELECT FALSE, 'You have already used a referral code'::TEXT;
      RETURN;
  END;
  
  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- Complete a pending referral and grant credits (internal function)
CREATE OR REPLACE FUNCTION public.complete_pending_referral(p_referee_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
BEGIN
  -- Find and lock the pending referral
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referee_id = p_referee_id
    AND status = 'pending'
  FOR UPDATE SKIP LOCKED;
  
  IF v_referral IS NULL THEN
    RETURN;
  END IF;
  
  -- Grant credits to referrer (200 credits)
  INSERT INTO public.user_credits (user_id, balance, total_earned)
  VALUES (v_referral.referrer_id, v_referral.referrer_credits, v_referral.referrer_credits)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_credits.balance + v_referral.referrer_credits,
    total_earned = user_credits.total_earned + v_referral.referrer_credits,
    last_updated = now();
  
  -- Grant credits to referee (50 credits)
  INSERT INTO public.user_credits (user_id, balance, total_earned)
  VALUES (v_referral.referee_id, v_referral.referee_credits, v_referral.referee_credits)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_credits.balance + v_referral.referee_credits,
    total_earned = user_credits.total_earned + v_referral.referee_credits,
    last_updated = now();
  
  -- Mark referral as completed
  UPDATE public.referrals
  SET status = 'completed', completed_at = now()
  WHERE id = v_referral.id;
END;
$$;

-- Get referral statistics for the current user
CREATE OR REPLACE FUNCTION public.get_referral_stats()
RETURNS TABLE(
  referral_code TEXT,
  total_referrals INTEGER,
  pending_referrals INTEGER,
  completed_referrals INTEGER,
  total_credits_earned INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_code TEXT;
  v_is_student BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if user is a student
  SELECT EXISTS (SELECT 1 FROM public.student WHERE id = v_user_id) INTO v_is_student;
  IF NOT v_is_student THEN
    RAISE EXCEPTION 'Referral stats are only available for talent accounts';
  END IF;
  
  SELECT rc.code INTO v_code FROM public.referral_codes rc WHERE rc.user_id = v_user_id;
  
  RETURN QUERY
  SELECT
    v_code,
    COALESCE((SELECT COUNT(*)::INTEGER FROM public.referrals WHERE referrer_id = v_user_id), 0),
    COALESCE((SELECT COUNT(*)::INTEGER FROM public.referrals WHERE referrer_id = v_user_id AND status = 'pending'), 0),
    COALESCE((SELECT COUNT(*)::INTEGER FROM public.referrals WHERE referrer_id = v_user_id AND status = 'completed'), 0),
    COALESCE((SELECT SUM(referrer_credits)::INTEGER FROM public.referrals WHERE referrer_id = v_user_id AND status = 'completed'), 0);
END;
$$;

-- =============================================================================
-- TRACKING FUNCTIONS
-- =============================================================================

-- Get current user's referral status as a referee (were they referred?)
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

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::INTEGER, NULL::TEXT;
  END IF;
END;
$$;

-- Get list of users the current user has referred
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
    CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END,
    r.created_at DESC;
END;
$$;

-- =============================================================================
-- LEADERBOARD FUNCTIONS
-- =============================================================================

-- Get top N referrers for leaderboard (limit capped at 100)
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
  v_safe_limit := GREATEST(1, LEAST(COALESCE(p_limit, 10), 100));
  
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

-- Get current user's rank on the leaderboard
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

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::INTEGER, 0, 0, v_total_participants;
  END IF;
END;
$$;

-- =============================================================================
-- MODIFY use_credits TO TRIGGER REFERRAL COMPLETION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.use_credits(p_user_id UUID, p_amount INTEGER DEFAULT 1)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
  v_current_total_used INTEGER;
  v_new_balance INTEGER;
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: can only use your own credits';
  END IF;

  SELECT balance, total_used INTO v_current_balance, v_current_total_used
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN QUERY SELECT FALSE, COALESCE(v_current_balance, 0);
    RETURN;
  END IF;
  
  UPDATE public.user_credits
  SET 
    balance = balance - p_amount,
    total_used = total_used + p_amount,
    last_updated = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  -- Complete any pending referral on first credit usage
  IF v_current_total_used = 0 THEN
    PERFORM complete_pending_referral(p_user_id);
  END IF;
  
  RETURN QUERY SELECT TRUE, v_new_balance;
END;
$$;

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT SELECT ON public.referral_codes TO authenticated;
GRANT SELECT ON public.referrals TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_or_create_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_referral_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_referrals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_leaderboard(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_leaderboard_rank() TO authenticated;

-- Revoke direct access to internal function
REVOKE EXECUTE ON FUNCTION public.complete_pending_referral(UUID) FROM authenticated, anon, public;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.referral_codes IS 'Stores unique referral codes for each user. Codes are 8-character lowercase alphanumeric strings.';
COMMENT ON TABLE public.referrals IS 'Tracks referral relationships between users. Status transitions from pending to completed when the referee first uses credits.';
COMMENT ON FUNCTION public.get_or_create_referral_code() IS 'Returns the current user''s referral code, creating one if needed. Students only.';
COMMENT ON FUNCTION public.apply_referral_code(TEXT) IS 'Associates a referral code with the current user. Students only, 7-day limit, handles race conditions.';
COMMENT ON FUNCTION public.complete_pending_referral(UUID) IS 'Internal function that grants credits when a referral is completed. Not callable by users.';
COMMENT ON FUNCTION public.get_referral_stats() IS 'Returns referral statistics for the current user. Students only.';
COMMENT ON FUNCTION public.get_my_referral_status() IS 'Returns the current user''s status as a referee (were they referred?).';
COMMENT ON FUNCTION public.get_my_referrals() IS 'Returns list of users the current user has referred.';
COMMENT ON FUNCTION public.get_referral_leaderboard(INTEGER) IS 'Returns top N referrers for the leaderboard. Limit capped at 100.';
COMMENT ON FUNCTION public.get_my_leaderboard_rank() IS 'Returns current user''s rank on the referral leaderboard.';
