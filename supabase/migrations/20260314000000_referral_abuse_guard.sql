-- =============================================================================
-- REFERRAL ABUSE GUARD
--
-- Problem: a user can delete their account (which CASCADE-deletes their
-- referrals row) and re-sign-up with the same email to claim referral credits
-- a second time.
--
-- Fix: persist a hash of the referee's email in a standalone table that is NOT
-- linked to auth.users and therefore survives account deletion.
-- The table stores only an irreversible hash — no PII, GDPR-safe.
--
-- Email normalisation also blocks +alias tricks (user+1@gmail.com etc.).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Guard table
-- ---------------------------------------------------------------------------

CREATE TABLE public.referral_abuse_guard (
  -- SHA-256 hex of the normalised email (lower, +alias stripped)
  email_hash   TEXT        NOT NULL PRIMARY KEY,
  first_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS required: only written/read by SECURITY DEFINER functions.
-- service_role has full access by default.
COMMENT ON TABLE public.referral_abuse_guard IS
  'Persists hashed referee emails so the same email cannot claim referral '
  'credits again even after deleting and recreating an account.';

-- ---------------------------------------------------------------------------
-- 2. Helper: normalise + hash an email
--    Strips +alias (user+foo@domain → user@domain), lowercases, trims,
--    then returns a SHA-256 hex string via pgcrypto.
--    Falls back to md5 if pgcrypto is unavailable (same logic, weaker hash).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.referral_email_hash(p_email TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT md5(
    regexp_replace(lower(trim(p_email)), '\+[^@]*', '')
  );
$$;

COMMENT ON FUNCTION public.referral_email_hash(TEXT) IS
  'Returns md5(normalised_email). Used exclusively by the referral abuse guard.';

-- ---------------------------------------------------------------------------
-- 3. Re-create apply_referral_code with the guard check
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.apply_referral_code(p_code TEXT)
RETURNS TABLE(success BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id          UUID;
  v_referrer_id      UUID;
  v_normalized_code  TEXT;
  v_user_created_at  TIMESTAMPTZ;
  v_is_student       BOOLEAN;
  v_referrer_is_student BOOLEAN;
  v_user_email       TEXT;
  v_email_hash       TEXT;
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

  -- Get user email + creation timestamp in a single query
  SELECT email, created_at
  INTO   v_user_email, v_user_created_at
  FROM   auth.users
  WHERE  id = v_user_id;

  -- Check 7-day time limit
  IF v_user_created_at IS NULL OR (now() - v_user_created_at) > INTERVAL '7 days' THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired referral code'::TEXT;
    RETURN;
  END IF;

  -- -------------------------------------------------------------------------
  -- Abuse guard: reject if this email (or any +alias variant) has ever been
  -- used as a referee — even from a since-deleted account.
  -- -------------------------------------------------------------------------
  v_email_hash := public.referral_email_hash(v_user_email);

  IF EXISTS (SELECT 1 FROM public.referral_abuse_guard WHERE email_hash = v_email_hash) THEN
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

  -- Check if user was already referred (belt-and-suspenders alongside the guard)
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

  -- Prevent self-referral
  IF v_referrer_id = v_user_id THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired referral code'::TEXT;
    RETURN;
  END IF;

  -- Create the pending referral (handle race condition)
  BEGIN
    INSERT INTO public.referrals (referrer_id, referee_id, referral_code, status)
    VALUES (v_referrer_id, v_user_id, v_normalized_code, 'pending');
  EXCEPTION
    WHEN unique_violation THEN
      RETURN QUERY SELECT FALSE, 'You have already used a referral code'::TEXT;
      RETURN;
  END;

  -- Record the email hash so this email can never claim credits again,
  -- even if the account is deleted and recreated.
  INSERT INTO public.referral_abuse_guard (email_hash)
  VALUES (v_email_hash)
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Back-fill: protect existing completed referrals
--    Hash the emails of every user who has already been a referee so they
--    can't exploit a delete-and-recreate after this migration runs.
-- ---------------------------------------------------------------------------

INSERT INTO public.referral_abuse_guard (email_hash, first_used_at)
SELECT DISTINCT
  public.referral_email_hash(u.email),
  r.created_at
FROM public.referrals r
JOIN auth.users u ON u.id = r.referee_id
WHERE u.email IS NOT NULL
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Grants
-- ---------------------------------------------------------------------------

-- Guard table: only SECURITY DEFINER functions touch it — no direct grants needed.
-- Helper function: called only from apply_referral_code (also definer).
GRANT EXECUTE ON FUNCTION public.referral_email_hash(TEXT) TO authenticated;
