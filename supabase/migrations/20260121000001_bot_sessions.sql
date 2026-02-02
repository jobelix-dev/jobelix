-- Bot Sessions Table
-- Tracks active and completed bot automation sessions for real-time status updates

CREATE TABLE bot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session lifecycle
  status TEXT NOT NULL DEFAULT 'starting',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_heartbeat_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Current activity (updated in real-time)
  current_activity TEXT,
  activity_details JSONB,
  
  -- Statistics
  jobs_found INTEGER DEFAULT 0,
  jobs_applied INTEGER DEFAULT 0,
  jobs_failed INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  
  -- Error tracking
  error_message TEXT,
  error_details JSONB,
  
  -- Bot metadata
  bot_version TEXT,
  platform TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('starting', 'running', 'completed', 'failed', 'stopped'))
);

-- Indexes for performance
CREATE INDEX idx_bot_sessions_user_status ON bot_sessions(user_id, status);
CREATE INDEX idx_bot_sessions_user_updated ON bot_sessions(user_id, updated_at DESC);
CREATE INDEX idx_bot_sessions_heartbeat ON bot_sessions(last_heartbeat_at) 
  WHERE status IN ('starting', 'running');  -- Detect stale sessions

-- Enable Row Level Security
ALTER TABLE bot_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own sessions
CREATE POLICY "Users view own sessions" ON bot_sessions
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- Users can insert their own sessions (via API with service role)
CREATE POLICY "Users insert own sessions" ON bot_sessions
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can update their own sessions (for stop functionality)
CREATE POLICY "Users update own sessions" ON bot_sessions
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bot_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE TRIGGER set_bot_session_updated_at
  BEFORE UPDATE ON bot_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_bot_session_timestamp();

-- Function to cleanup stale sessions (running sessions with no heartbeat for 5+ minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_bot_sessions()
RETURNS INTEGER AS $$
DECLARE
  stale_count INTEGER;
BEGIN
  UPDATE bot_sessions
  SET 
    status = 'failed',
    error_message = 'Session timed out - no heartbeat received',
    completed_at = NOW()
  WHERE 
    status IN ('starting', 'running')
    AND last_heartbeat_at < NOW() - INTERVAL '5 minutes'
  RETURNING 1 INTO stale_count;
  
  GET DIAGNOSTICS stale_count = ROW_COUNT;
  RETURN stale_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Enable Realtime for instant updates (critical for live status)
ALTER PUBLICATION supabase_realtime ADD TABLE bot_sessions;

-- Grant Realtime permissions
GRANT SELECT ON bot_sessions TO authenticated;

-- Comment for documentation
COMMENT ON TABLE bot_sessions IS 'Tracks bot automation sessions with real-time updates via Supabase Realtime. Frontend subscribes to changes for live status display without polling.';
