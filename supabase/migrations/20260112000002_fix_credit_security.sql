-- Fix security issues in credit purchase system
-- 1. Make stripe_event_id UNIQUE to prevent duplicate event processing
-- 2. Add transaction-safe credit addition function

-- Add UNIQUE constraint to stripe_event_id if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'credit_purchases_stripe_event_id_key'
  ) THEN
    ALTER TABLE public.credit_purchases 
    ADD CONSTRAINT credit_purchases_stripe_event_id_key 
    UNIQUE (stripe_event_id);
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_credit_purchases_event_id 
ON public.credit_purchases(stripe_event_id);

-- Create index for session_id + status lookups
CREATE INDEX IF NOT EXISTS idx_credit_purchases_session_status 
ON public.credit_purchases(stripe_checkout_session_id, status);

-- Drop all versions of the function (handles different signatures)
DROP FUNCTION IF EXISTS add_purchased_credits(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS add_purchased_credits(UUID, INTEGER, TEXT, TEXT, TEXT, INTEGER, TEXT);

-- Create new transaction-safe function
CREATE OR REPLACE FUNCTION add_purchased_credits(
  p_user_id UUID,
  p_credits_amount INTEGER,
  p_payment_intent_id TEXT,
  p_stripe_event_id TEXT,
  p_session_id TEXT,
  p_amount_cents INTEGER,
  p_currency TEXT
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
  v_purchase_id UUID;
BEGIN
  -- SECURITY: Check if this event was already processed (idempotency)
  -- This check happens INSIDE the transaction with row lock
  SELECT id INTO v_purchase_id
  FROM public.credit_purchases
  WHERE stripe_event_id = p_stripe_event_id
  FOR UPDATE NOWAIT; -- Lock immediately or fail
  
  IF v_purchase_id IS NOT NULL THEN
    -- Event already processed
    SELECT balance INTO v_new_balance
    FROM public.user_credits
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT TRUE, COALESCE(v_new_balance, 0), 'Already processed'::TEXT;
    RETURN;
  END IF;

  -- Check by session ID as backup
  SELECT id INTO v_purchase_id
  FROM public.credit_purchases
  WHERE stripe_checkout_session_id = p_session_id
    AND status = 'completed'
  FOR UPDATE NOWAIT;
  
  IF v_purchase_id IS NOT NULL THEN
    -- Session already completed
    SELECT balance INTO v_new_balance
    FROM public.user_credits
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT TRUE, COALESCE(v_new_balance, 0), 'Session already completed'::TEXT;
    RETURN;
  END IF;

  -- ATOMIC OPERATION: Update purchase record AND add credits in same transaction
  
  -- Step 1: Update purchase record to completed
  UPDATE public.credit_purchases
  SET 
    stripe_payment_intent_id = p_payment_intent_id,
    stripe_event_id = p_stripe_event_id,
    price_cents = p_amount_cents,
    currency = p_currency,
    status = 'completed',
    completed_at = now()
  WHERE stripe_checkout_session_id = p_session_id
    AND status = 'pending'
  RETURNING id INTO v_purchase_id;
  
  IF v_purchase_id IS NULL THEN
    -- Purchase not found or already processed
    RETURN QUERY SELECT FALSE, 0, 'Purchase not found or already completed'::TEXT;
    RETURN;
  END IF;

  -- Step 2: Add credits to user balance
  INSERT INTO public.user_credits (user_id, balance, total_purchased, last_updated)
  VALUES (p_user_id, p_credits_amount, p_credits_amount, now())
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_credits.balance + p_credits_amount,
    total_purchased = user_credits.total_purchased + p_credits_amount,
    last_updated = now()
  RETURNING user_credits.balance INTO v_new_balance;
  
  -- Success
  RETURN QUERY SELECT TRUE, v_new_balance, 'Credits added successfully'::TEXT;
  
EXCEPTION
  WHEN lock_not_available THEN
    -- Another process is currently processing this event
    RETURN QUERY SELECT FALSE, 0, 'Event is being processed by another request'::TEXT;
  WHEN unique_violation THEN
    -- Event ID already exists (race condition caught)
    SELECT balance INTO v_new_balance
    FROM public.user_credits
    WHERE user_id = p_user_id;
    RETURN QUERY SELECT TRUE, COALESCE(v_new_balance, 0), 'Event already processed (caught by constraint)'::TEXT;
END;
$$;

COMMENT ON FUNCTION add_purchased_credits(UUID, INTEGER, TEXT, TEXT, TEXT, INTEGER, TEXT) IS 'Transaction-safe credit addition with idempotency protection. Prevents race conditions and duplicate credits.';
