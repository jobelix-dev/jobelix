-- =============================================================================
-- GITHUB OAUTH INTEGRATION
-- =============================================================================
-- Migration: 20260115000000_09_github_oauth
-- Purpose: Store OAuth connections for external services (GitHub)
-- Author: AI Assistant
-- Date: 2026-01-15
-- =============================================================================

-- =============================================================================
-- TABLES
-- =============================================================================

-- OAuth connections table for storing GitHub (and future) OAuth tokens
CREATE TABLE IF NOT EXISTS public.oauth_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'github', 'linkedin', etc.
  access_token TEXT NOT NULL, -- OAuth access token (consider encryption in production)
  refresh_token TEXT, -- OAuth refresh token (if available)
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT, -- Space-separated scopes granted
  expires_at TIMESTAMPTZ, -- Token expiration time (if provided by OAuth provider)
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ, -- Last time data was imported from this connection
  metadata JSONB, -- Additional provider-specific data (username, avatar, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one connection per user per provider
  UNIQUE(user_id, provider)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_oauth_connections_user_id ON public.oauth_connections(user_id);
CREATE INDEX idx_oauth_connections_provider ON public.oauth_connections(provider);
CREATE INDEX idx_oauth_connections_user_provider ON public.oauth_connections(user_id, provider);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.oauth_connections ENABLE ROW LEVEL SECURITY;

-- Users can view their own OAuth connections
CREATE POLICY "oauth_connections_select_own"
ON public.oauth_connections
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own OAuth connections
CREATE POLICY "oauth_connections_insert_own"
ON public.oauth_connections
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own OAuth connections
CREATE POLICY "oauth_connections_update_own"
ON public.oauth_connections
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own OAuth connections
CREATE POLICY "oauth_connections_delete_own"
ON public.oauth_connections
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger to update updated_at timestamp
CREATE TRIGGER set_oauth_connections_updated_at
BEFORE UPDATE ON public.oauth_connections
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- GRANTS
-- =============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oauth_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oauth_connections TO service_role;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.oauth_connections IS 'Stores OAuth connection tokens for external services like GitHub';
COMMENT ON COLUMN public.oauth_connections.provider IS 'OAuth provider name (github, linkedin, etc.)';
COMMENT ON COLUMN public.oauth_connections.access_token IS 'OAuth access token - consider encrypting in production';
COMMENT ON COLUMN public.oauth_connections.scope IS 'Space-separated OAuth scopes granted by user';
COMMENT ON COLUMN public.oauth_connections.last_synced_at IS 'Timestamp of last successful data import from this connection';
