-- Ephemeral progress tracking for long-running server operations.
-- Dedicated tables (not student/draft) so upsert works before profile exists.
-- Written/read via service role only — no RLS policies needed.

CREATE TABLE extraction_progress (
  user_id    UUID PRIMARY KEY,
  data       JSONB        NOT NULL,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE github_import_progress (
  user_id    UUID PRIMARY KEY,
  data       JSONB        NOT NULL,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
