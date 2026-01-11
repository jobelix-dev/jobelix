-- Migration: Create GPT tokens table for compiled app token access
-- Purpose: Store tokens that the compiled app will present to backend to
-- call OpenAI on behalf of users while enforcing per-token usage limits.

CREATE TABLE IF NOT EXISTS public.gpt_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uses_remaining integer NOT NULL DEFAULT 100,
  max_uses integer NOT NULL DEFAULT 100,
  revoked boolean NOT NULL DEFAULT false,
  is_daily_token boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NULL
);

-- Index on token for fast lookup
CREATE INDEX IF NOT EXISTS idx_gpt_tokens_token ON public.gpt_tokens (token);

-- Index on user_id and created_at for daily token queries
CREATE INDEX IF NOT EXISTS idx_gpt_tokens_user_created ON public.gpt_tokens (user_id, created_at DESC);

COMMENT ON TABLE public.gpt_tokens IS 'Tokens for compiled apps to call backend GPT proxy. Daily usage tracking and revocation per user.';
COMMENT ON COLUMN public.gpt_tokens.is_daily_token IS 'If true, this is a daily token with one-per-day generation limit.';

-- RLS Policies: Users can only see their own tokens
ALTER TABLE public.gpt_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tokens"
  ON public.gpt_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens"
  ON public.gpt_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
