-- Add cost tracking to gpt_tokens table
-- This tracks total cost (in USD) for all API calls made with this token

ALTER TABLE gpt_tokens
ADD COLUMN total_cost DECIMAL(10, 6) DEFAULT 0.00 NOT NULL;

COMMENT ON COLUMN gpt_tokens.total_cost IS 'Total cost in USD for all API calls made with this token';

-- Add index for cost queries (e.g., getting total cost per user)
CREATE INDEX idx_gpt_tokens_user_cost ON gpt_tokens(user_id, total_cost);

-- Optional: Add a function to calculate total cost per user
CREATE OR REPLACE FUNCTION get_user_total_cost(user_uuid UUID)
RETURNS DECIMAL(10, 6)
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(SUM(total_cost), 0.00)
  FROM gpt_tokens
  WHERE user_id = user_uuid;
$$;

COMMENT ON FUNCTION get_user_total_cost IS 'Get total cost across all tokens for a specific user';
