-- Refund a credit that was deducted but for which no service was rendered
-- (e.g. the LLM call failed after the credit was reserved).
-- Service-role only: called exclusively from server-side API routes.
CREATE OR REPLACE FUNCTION public.refund_credit(p_user_id uuid, p_amount integer DEFAULT 1)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.user_credits
  SET
    balance    = balance + p_amount,
    total_used = GREATEST(0, total_used - p_amount),
    last_updated = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Restrict to service_role only — this must never be callable by end users.
REVOKE EXECUTE ON FUNCTION public.refund_credit(uuid, integer) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.refund_credit(uuid, integer) TO service_role;
