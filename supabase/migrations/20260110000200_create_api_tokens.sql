-- Migration: API tokens for Python desktop app
-- Secure token-based authentication for compiled apps
-- Auto-generated on user signup

-- Enable pgcrypto extension for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create API tokens table (ONE token per user, auto-generated)
CREATE TABLE IF NOT EXISTS public.api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast token lookup
CREATE INDEX idx_api_tokens_token ON public.api_tokens(token);
CREATE INDEX idx_api_tokens_user ON public.api_tokens(user_id);

-- RLS Policies
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own API token"
  ON public.api_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Update existing handle_new_user function to also create API token
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  user_role TEXT;
  v_token TEXT;
BEGIN
  user_role := NEW.raw_user_meta_data ->> 'role';

  IF user_role = 'company' THEN
    INSERT INTO public.company (id, mail_adress)
    VALUES (NEW.id, NEW.email);
    
  ELSIF user_role = 'student' THEN
    INSERT INTO public.student (id, mail_adress)
    VALUES (NEW.id, NEW.email);
    
  ELSE
    RAISE WARNING 'Unknown role during subscribing: %', user_role;
  END IF;

  -- Generate API token for all users (use extensions.gen_random_bytes)
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  INSERT INTO public.api_tokens (user_id, token)
  VALUES (NEW.id, v_token);

  RETURN NEW;
END;
$$;

-- Function: Update last_used_at timestamp
CREATE OR REPLACE FUNCTION update_token_last_used(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.api_tokens
  SET last_used_at = now()
  WHERE token = p_token;
END;
$$;

COMMENT ON TABLE public.api_tokens IS 'API tokens for Python desktop app - auto-generated on signup';
COMMENT ON FUNCTION update_token_last_used IS 'Update last_used_at timestamp for token';
