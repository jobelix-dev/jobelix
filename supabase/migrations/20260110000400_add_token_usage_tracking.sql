-- Migration: Add token usage tracking to api_tokens table
-- Track total tokens used and estimated cost for each API token

-- Add token usage columns
ALTER TABLE public.api_tokens
  ADD COLUMN IF NOT EXISTS total_tokens_used BIGINT DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS total_cost_usd NUMERIC(10, 6) DEFAULT 0 NOT NULL;

-- Create function to update token usage and cost
CREATE OR REPLACE FUNCTION update_token_usage(
  p_token TEXT,
  p_tokens_used INTEGER,
  p_cost_usd NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.api_tokens
  SET 
    total_tokens_used = total_tokens_used + p_tokens_used,
    total_cost_usd = total_cost_usd + p_cost_usd,
    last_used_at = now()
  WHERE token = p_token;
END;
$$;

COMMENT ON COLUMN api_tokens.total_tokens_used IS 'Total number of tokens (input + output) used by this token';
COMMENT ON COLUMN api_tokens.total_cost_usd IS 'Estimated total cost in USD for all API calls made with this token';
COMMENT ON FUNCTION update_token_usage IS 'Update token usage statistics and cost tracking';
