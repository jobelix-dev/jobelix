-- Migration: Add Stripe idempotency fields to credit_purchases
-- Prevents duplicate credit grants from webhook retries and replay attacks

-- Add stripe_event_id for webhook idempotency
ALTER TABLE public.credit_purchases
  ADD COLUMN IF NOT EXISTS stripe_event_id TEXT;

-- Add stripe_checkout_session_id for session-level protection
ALTER TABLE public.credit_purchases
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

-- Prevent duplicate event processing (webhook idempotency)
-- Multiple webhooks with same event_id will be rejected
CREATE UNIQUE INDEX IF NOT EXISTS credit_purchases_event_uniq
  ON public.credit_purchases(stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

-- Prevent duplicate session processing (replay attack protection)
-- Same checkout session cannot be used to grant credits twice
CREATE UNIQUE INDEX IF NOT EXISTS credit_purchases_session_uniq
  ON public.credit_purchases(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

-- Drop old function signature
DROP FUNCTION IF EXISTS add_purchased_credits(UUID, INTEGER, INTEGER);

-- Update the add_purchased_credits function to accept these fields
CREATE OR REPLACE FUNCTION add_purchased_credits(
  p_user_id UUID,
  p_credits INTEGER,
  p_amount_cents INTEGER,
  p_stripe_event_id TEXT DEFAULT NULL,
  p_stripe_session_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert purchase record (will fail if event_id or session_id already exists)
  INSERT INTO public.credit_purchases (
    user_id, 
    credits, 
    amount_cents, 
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
$$;

COMMENT ON FUNCTION add_purchased_credits(UUID, INTEGER, INTEGER, TEXT, TEXT) IS 'Add purchased credits with Stripe idempotency protection';
