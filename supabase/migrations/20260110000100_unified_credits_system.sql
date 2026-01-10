-- Migration: Unified credits system
-- Replace token-based system with simple credit balance

-- Drop old gpt_tokens table
DROP TABLE IF EXISTS public.gpt_tokens CASCADE;

-- Create unified credits table
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_used INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Track daily credit grants (prevent multiple claims per day)
CREATE TABLE IF NOT EXISTS public.daily_credit_grants (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_date DATE NOT NULL,
  credits_amount INTEGER NOT NULL DEFAULT 100,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, granted_date)
);

-- Purchase history for receipts/refunds
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT,
  credits_amount INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_user_credits_balance ON public.user_credits(user_id, balance);
CREATE INDEX idx_daily_grants_user_date ON public.daily_credit_grants(user_id, granted_date DESC);
CREATE INDEX idx_purchases_user ON public.credit_purchases(user_id, purchased_at DESC);
CREATE INDEX idx_purchases_stripe ON public.credit_purchases(stripe_payment_intent_id);

-- RLS Policies
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_credit_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credits"
  ON public.user_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own daily grants"
  ON public.daily_credit_grants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own purchases"
  ON public.credit_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Function: Grant daily credits (idempotent)
CREATE OR REPLACE FUNCTION grant_daily_credits(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, credits_granted INTEGER, new_balance INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credits_amount INTEGER := 50;
  v_new_balance INTEGER;
BEGIN
  -- Try to insert daily grant (will fail if already claimed today)
  INSERT INTO public.daily_credit_grants (user_id, granted_date, credits_amount)
  VALUES (p_user_id, CURRENT_DATE, v_credits_amount)
  ON CONFLICT (user_id, granted_date) DO NOTHING;
  
  -- Check if we actually inserted (granted credits today)
  IF NOT FOUND THEN
    -- Already claimed today
    SELECT balance INTO v_new_balance
    FROM public.user_credits
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT FALSE, 0, COALESCE(v_new_balance, 0);
    RETURN;
  END IF;
  
  -- Add credits to balance
  INSERT INTO public.user_credits (user_id, balance, total_earned, last_updated)
  VALUES (p_user_id, v_credits_amount, v_credits_amount, now())
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_credits.balance + v_credits_amount,
    total_earned = user_credits.total_earned + v_credits_amount,
    last_updated = now()
  RETURNING user_credits.balance INTO v_new_balance;
  
  RETURN QUERY SELECT TRUE, v_credits_amount, v_new_balance;
END;
$$;

-- Function: Use credits (for API calls)
CREATE OR REPLACE FUNCTION use_credits(p_user_id UUID, p_amount INTEGER DEFAULT 1)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE; -- Lock row
  
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
  
  RETURN QUERY SELECT TRUE, v_new_balance;
END;
$$;

-- Function: Add purchased credits (called after Stripe payment)
CREATE OR REPLACE FUNCTION add_purchased_credits(
  p_user_id UUID,
  p_credits_amount INTEGER,
  p_payment_intent_id TEXT
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Add credits to balance
  INSERT INTO public.user_credits (user_id, balance, total_purchased, last_updated)
  VALUES (p_user_id, p_credits_amount, p_credits_amount, now())
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_credits.balance + p_credits_amount,
    total_purchased = user_credits.total_purchased + p_credits_amount,
    last_updated = now()
  RETURNING user_credits.balance INTO v_new_balance;
  
  -- Update purchase record to completed
  UPDATE public.credit_purchases
  SET 
    status = 'completed',
    completed_at = now()
  WHERE stripe_payment_intent_id = p_payment_intent_id;
  
  RETURN QUERY SELECT TRUE, v_new_balance;
END;
$$;

COMMENT ON TABLE public.user_credits IS 'Unified credit balance for all users (earned + purchased)';
COMMENT ON TABLE public.daily_credit_grants IS 'Track daily free credit claims (100 per day limit)';
COMMENT ON TABLE public.credit_purchases IS 'Purchase history for paid credits via Stripe';
COMMENT ON FUNCTION grant_daily_credits IS 'Grant 50 free credits once per day (idempotent)';
COMMENT ON FUNCTION use_credits IS 'Deduct credits for API calls, returns success + new balance';
COMMENT ON FUNCTION add_purchased_credits IS 'Add credits after successful Stripe payment';
