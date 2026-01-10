-- Migration: Create GPT tokens table for compiled app token access
-- Purpose: Store tokens that the compiled app will present to backend to
-- call OpenAI on behalf of users while enforcing per-token usage limits.

CREATE TABLE IF NOT EXISTS public.gpt_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  user_id uuid NULL,
  uses_remaining integer DEFAULT NULL,
  max_uses integer DEFAULT NULL,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NULL
);

-- Index on token for fast lookup
CREATE INDEX IF NOT EXISTS idx_gpt_tokens_token ON public.gpt_tokens (token);

COMMENT ON TABLE public.gpt_tokens IS 'Tokens for compiled apps to call backend GPT proxy. Basic usage tracking and revocation.';
