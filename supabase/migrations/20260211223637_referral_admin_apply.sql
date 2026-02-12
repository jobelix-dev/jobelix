-- =============================================================================
-- FIX: Add admin version of apply_referral_code
-- =============================================================================
-- 
-- Problem: The apply_referral_code function uses auth.uid() to get the current
-- user, but when called from server-side code (auth callback) using the service
-- role client, auth.uid() returns NULL because there's no authenticated session.
--
-- Solution: Create an admin version that accepts the user_id as a parameter.
-- This function can ONLY be called by service_role (no authenticated/anon access).
-- =============================================================================

-- Admin version of apply_referral_code for server-side use
-- Security: Only callable with service_role key (not authenticated users)
CREATE OR REPLACE FUNCTION public.apply_referral_code_admin(p_user_id UUID, p_code TEXT)
RETURNS TABLE(success BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_normalized_code TEXT;
  v_user_created_at TIMESTAMPTZ;
  v_is_student BOOLEAN;
  v_referrer_is_student BOOLEAN;
BEGIN
  -- Defense in depth: verify service_role even though REVOKE should block others
  IF NOT public.is_service_role() THEN
    RETURN QUERY SELECT FALSE, 'Unauthorized'::TEXT;
    RETURN;
  END IF;

  -- Validate user_id is provided
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User ID is required'::TEXT;
    RETURN;
  END IF;
  
  -- Check if user is a student
  SELECT EXISTS (SELECT 1 FROM public.student WHERE id = p_user_id) INTO v_is_student;
  IF NOT v_is_student THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired referral code'::TEXT;
    RETURN;
  END IF;
  
  -- Get user's creation timestamp for time limit check
  SELECT created_at INTO v_user_created_at
  FROM auth.users
  WHERE id = p_user_id;
  
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
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referee_id = p_user_id) THEN
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
  IF v_referrer_id = p_user_id THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired referral code'::TEXT;
    RETURN;
  END IF;
  
  -- Create the pending referral with exception handling for race condition
  BEGIN
    INSERT INTO public.referrals (referrer_id, referee_id, referral_code, status)
    VALUES (v_referrer_id, p_user_id, v_normalized_code, 'pending');
  EXCEPTION 
    WHEN unique_violation THEN
      RETURN QUERY SELECT FALSE, 'You have already used a referral code'::TEXT;
      RETURN;
  END;
  
  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- Grant execute only to service_role (NOT to authenticated users)
-- This prevents users from applying codes for other users
REVOKE EXECUTE ON FUNCTION public.apply_referral_code_admin(UUID, TEXT) FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.apply_referral_code_admin(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION public.apply_referral_code_admin(UUID, TEXT) IS 
  'Admin-only version of apply_referral_code. Takes user_id as parameter for server-side use. Only callable with service_role.';
