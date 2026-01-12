/**
 * API Rate Limiting Tables and Functions
 * 
 * Tracks API calls per user to prevent abuse of GPT-4 endpoint
 * Rate limits: 
 * - 100 calls per hour per user
 * - 500 calls per day per user
 */

-- Table to track API call history
CREATE TABLE IF NOT EXISTS api_call_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast rate limit queries
CREATE INDEX IF NOT EXISTS idx_api_call_log_user_endpoint ON api_call_log (user_id, endpoint, created_at);
CREATE INDEX IF NOT EXISTS idx_api_call_log_created_at ON api_call_log (created_at);

-- RLS policies for api_call_log (only service role can write)
ALTER TABLE api_call_log ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role has full access to api_call_log"
  ON api_call_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can read their own logs (optional - for debugging)
CREATE POLICY "Users can view own api_call_log"
  ON api_call_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

/**
 * Function to check rate limit before making API call
 * Returns: { allowed: boolean, hourly_count: number, daily_count: number }
 */
CREATE OR REPLACE FUNCTION check_api_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_hourly_limit INT DEFAULT 100,
  p_daily_limit INT DEFAULT 500
)
RETURNS TABLE(
  allowed BOOLEAN,
  hourly_count BIGINT,
  daily_count BIGINT,
  hourly_remaining INT,
  daily_remaining INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hourly_count BIGINT;
  v_daily_count BIGINT;
BEGIN
  -- Count calls in the last hour
  SELECT COUNT(*) INTO v_hourly_count
  FROM api_call_log
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND created_at > NOW() - INTERVAL '1 hour';

  -- Count calls in the last 24 hours
  SELECT COUNT(*) INTO v_daily_count
  FROM api_call_log
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND created_at > NOW() - INTERVAL '24 hours';

  -- Return results
  RETURN QUERY SELECT
    (v_hourly_count < p_hourly_limit AND v_daily_count < p_daily_limit) AS allowed,
    v_hourly_count AS hourly_count,
    v_daily_count AS daily_count,
    (p_hourly_limit - v_hourly_count::INT) AS hourly_remaining,
    (p_daily_limit - v_daily_count::INT) AS daily_remaining;
END;
$$;

/**
 * Function to log an API call (call AFTER rate limit check passes)
 */
CREATE OR REPLACE FUNCTION log_api_call(
  p_user_id UUID,
  p_endpoint TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO api_call_log (user_id, endpoint)
  VALUES (p_user_id, p_endpoint)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

/**
 * Cleanup function to remove old logs (run periodically via cron)
 * Keeps last 30 days of logs for analytics
 */
CREATE OR REPLACE FUNCTION cleanup_old_api_logs()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count BIGINT;
BEGIN
  DELETE FROM api_call_log
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- Grant execute permissions to authenticated users (for check function)
GRANT EXECUTE ON FUNCTION check_api_rate_limit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION log_api_call TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_api_logs TO service_role;

-- Add comment for documentation
COMMENT ON TABLE api_call_log IS 'Tracks API calls for rate limiting (GPT-4 endpoint)';
COMMENT ON FUNCTION check_api_rate_limit IS 'Check if user is within rate limits (100/hr, 500/day)';
COMMENT ON FUNCTION log_api_call IS 'Log an API call after rate limit check passes';
COMMENT ON FUNCTION cleanup_old_api_logs IS 'Remove logs older than 30 days (run via cron)';
