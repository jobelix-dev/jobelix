-- =============================================================================
-- REFERRAL SYSTEM SECURITY FIXES
-- =============================================================================
-- 1. Time-limit referral code application (must be within 7 days of account creation)
-- 2. Restrict to students only (both referrer and referee must be students)
-- 3. Uniform error messages to prevent enumeration
-- =============================================================================

-- =============================================================================
-- UPDATED apply_referral_code FUNCTION
-- =============================================================================
-- Security improvements:
-- - Only allows students to participate (checks both referrer and referee)
-- - Time-limited: referral code must be applied within 7 days of account creation
-- - Uniform error messages for invalid codes (prevents enumeration)
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
  
  -- Normalize code to lowercase
  v_normalized_code := lower(trim(p_code));
  
  -- Validate code format
  IF v_normalized_code !~ '^[a-z0-9]{8}$' THEN
    -- Use generic message to prevent format enumeration
    RETURN QUERY SELECT FALSE, 'Invalid or expired referral code'::TEXT;
    RETURN;
  END IF;
  
  -- Check if user is a student
  SELECT EXISTS (SELECT 1 FROM public.student WHERE id = v_user_id) INTO v_is_student;
  IF NOT v_is_student THEN
    RETURN QUERY SELECT FALSE, 'Referral codes are only available for talent accounts'::TEXT;
    RETURN;
  END IF;
  
  -- Get user creation time from auth.users
  SELECT created_at INTO v_user_created_at
  FROM auth.users
  WHERE id = v_user_id;
  
  -- Time limit: must apply within 7 days of account creation
  IF v_user_created_at IS NULL OR (now() - v_user_created_at) > INTERVAL '7 days' THEN
    RETURN QUERY SELECT FALSE, 'Referral codes can only be used within 7 days of account creation'::TEXT;
    RETURN;
  END IF;
  
  -- Check if user was already referred
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referee_id = v_user_id) THEN
    RETURN QUERY SELECT FALSE, 'You have already used a referral code'::TEXT;
    RETURN;
  END IF;
  
  -- Find the referrer by code
  SELECT rc.user_id INTO v_referrer_id
  FROM public.referral_codes rc
  WHERE rc.code = v_normalized_code;
  
  -- Generic error for code not found (prevents enumeration)
  IF v_referrer_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired referral code'::TEXT;
    RETURN;
  END IF;
  
  -- Prevent self-referral (generic message)
  IF v_referrer_id = v_user_id THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired referral code'::TEXT;
    RETURN;
  END IF;
  
  -- Check if referrer is also a student (both parties must be students)
  SELECT EXISTS (SELECT 1 FROM public.student WHERE id = v_referrer_id) INTO v_referrer_is_student;
  IF NOT v_referrer_is_student THEN
    -- This shouldn't happen normally, but handle it gracefully
    RETURN QUERY SELECT FALSE, 'Invalid or expired referral code'::TEXT;
    RETURN;
  END IF;
  
  -- Create the pending referral
  INSERT INTO public.referrals (referrer_id, referee_id, referral_code, status)
  VALUES (v_referrer_id, v_user_id, v_normalized_code, 'pending');
  
  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- =============================================================================
-- UPDATED get_or_create_referral_code FUNCTION
-- =============================================================================
-- Security improvement: Only students can get/create referral codes
-- =============================================================================

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
  -- Get current user
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
      -- Continue loop to try again
    END;
  END LOOP;
END;
$$;

-- =============================================================================
-- UPDATED get_referral_stats FUNCTION
-- =============================================================================
-- Security improvement: Only students can view referral stats
-- =============================================================================

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
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if user is a student
  SELECT EXISTS (SELECT 1 FROM public.student WHERE id = v_user_id) INTO v_is_student;
  IF NOT v_is_student THEN
    RAISE EXCEPTION 'Referral stats are only available for talent accounts';
  END IF;
  
  -- Get user's referral code (create if doesn't exist)
  SELECT rc.code INTO v_code FROM public.referral_codes rc WHERE rc.user_id = v_user_id;
  
  -- Calculate stats
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
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION public.apply_referral_code(TEXT) IS 'Associates a referral code with the current user. Security: students only, 7-day time limit, uniform error messages.';
COMMENT ON FUNCTION public.get_or_create_referral_code() IS 'Returns the current user''s referral code, creating one if it doesn''t exist. Security: students only.';
COMMENT ON FUNCTION public.get_referral_stats() IS 'Returns referral statistics for the current user. Security: students only.';
