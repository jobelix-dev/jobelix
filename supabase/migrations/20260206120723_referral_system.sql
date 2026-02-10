-- =============================================================================
-- REFERRAL SYSTEM
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
-- - All credit grants via SECURITY DEFINER functions
-- - RLS: Users can only view their own data
-- =============================================================================

-- =============================================================================
-- TABLES
-- =============================================================================

-- User's personal referral code
CREATE TABLE public.referral_codes (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT referral_codes_code_unique UNIQUE (code),
  CONSTRAINT referral_codes_code_format CHECK (code ~ '^[a-z0-9]{8}$')
);

-- Referral relationships and status
CREATE TABLE public.referrals (
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
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_pending ON public.referrals(status) WHERE status = 'pending';
CREATE INDEX idx_referral_codes_code ON public.referral_codes(code);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Referral codes: users can only view their own code
CREATE POLICY "referral_codes_select_own" ON public.referral_codes
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- Referrals: users can view referrals where they are the referrer
CREATE POLICY "referrals_select_as_referrer" ON public.referrals
  FOR SELECT USING (referrer_id = (SELECT auth.uid()));

-- No direct INSERT/UPDATE/DELETE - all operations through SECURITY DEFINER functions

-- =============================================================================
-- FUNCTIONS
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

-- Get or create a referral code for the current user
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
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
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

-- Apply a referral code to the current user (called after signup)
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
    RETURN QUERY SELECT FALSE, 'Invalid referral code format'::TEXT;
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
  
  IF v_referrer_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Referral code not found'::TEXT;
    RETURN;
  END IF;
  
  -- Prevent self-referral
  IF v_referrer_id = v_user_id THEN
    RETURN QUERY SELECT FALSE, 'You cannot use your own referral code'::TEXT;
    RETURN;
  END IF;
  
  -- Create the pending referral
  INSERT INTO public.referrals (referrer_id, referee_id, referral_code, status)
  VALUES (v_referrer_id, v_user_id, v_normalized_code, 'pending');
  
  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- Complete a pending referral and grant credits to both parties
-- Called automatically when the referee uses credits for the first time
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
  
  -- No pending referral found
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
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user's referral code (create if doesn't exist)
  SELECT code INTO v_code FROM public.referral_codes WHERE user_id = v_user_id;
  
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
-- MODIFY use_credits TO TRIGGER REFERRAL COMPLETION
-- =============================================================================
-- We need to check if this is the user's first credit usage and complete any
-- pending referral. We'll create a new version of use_credits that includes this.

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
  -- SECURITY: Verify user can only use their own credits
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: can only use your own credits';
  END IF;

  -- Get current balance and total_used
  SELECT balance, total_used INTO v_current_balance, v_current_total_used
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
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
  
  -- REFERRAL COMPLETION: If this is the user's first credit usage, complete any pending referral
  IF v_current_total_used = 0 THEN
    PERFORM complete_pending_referral(p_user_id);
  END IF;
  
  RETURN QUERY SELECT TRUE, v_new_balance;
END;
$$;

-- =============================================================================
-- GRANTS
-- =============================================================================

-- Grant SELECT on tables to authenticated users (RLS will filter)
GRANT SELECT ON public.referral_codes TO authenticated;
GRANT SELECT ON public.referrals TO authenticated;

-- Grant EXECUTE on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_or_create_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_stats() TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.referral_codes IS 'Stores unique referral codes for each user. Codes are 8-character lowercase alphanumeric strings.';
COMMENT ON TABLE public.referrals IS 'Tracks referral relationships between users. Status transitions from pending to completed when the referee first uses credits.';
COMMENT ON FUNCTION public.get_or_create_referral_code() IS 'Returns the current user''s referral code, creating one if it doesn''t exist.';
COMMENT ON FUNCTION public.apply_referral_code(TEXT) IS 'Associates a referral code with the current user. Can only be done once per user.';
COMMENT ON FUNCTION public.complete_pending_referral(UUID) IS 'Internal function that grants credits to both parties when a referral is completed.';
COMMENT ON FUNCTION public.get_referral_stats() IS 'Returns referral statistics for the current user including code, counts, and total credits earned.';
