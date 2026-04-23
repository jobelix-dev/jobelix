-- Fix: extraction_progress and github_import_progress were created without RLS,
-- leaving all rows readable and writable by anonymous users.
-- Enabling RLS with no policies blocks anon/authenticated access entirely;
-- service_role bypasses RLS by default and retains full access.

ALTER TABLE public.extraction_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_import_progress ENABLE ROW LEVEL SECURITY;
