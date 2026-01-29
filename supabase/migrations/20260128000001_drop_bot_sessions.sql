-- Drop Bot Sessions Table and Related Infrastructure
-- This migration removes the bot_sessions table and related code
-- Bot status is now communicated via local IPC (stdout/stdin) instead of database

-- Remove from Realtime publication first
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS bot_sessions;

-- Drop the cleanup function
DROP FUNCTION IF EXISTS cleanup_stale_bot_sessions();

-- Drop the trigger
DROP TRIGGER IF EXISTS set_bot_session_updated_at ON bot_sessions;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_bot_session_timestamp();

-- Drop RLS policies
DROP POLICY IF EXISTS "Users view own sessions" ON bot_sessions;
DROP POLICY IF EXISTS "Users insert own sessions" ON bot_sessions;
DROP POLICY IF EXISTS "Users update own sessions" ON bot_sessions;

-- Drop indexes
DROP INDEX IF EXISTS idx_bot_sessions_user_status;
DROP INDEX IF EXISTS idx_bot_sessions_user_updated;
DROP INDEX IF EXISTS idx_bot_sessions_heartbeat;

-- Finally drop the table
DROP TABLE IF EXISTS bot_sessions;

-- NOTE: This migration removes the bot_sessions infrastructure
-- Bot-to-frontend communication is now handled via:
-- 1. Python bot prints [STATUS]{json} to stdout
-- 2. Electron process-manager.js parses stdout
-- 3. Status forwarded via IPC channel to renderer
-- This eliminates network latency and database writes
