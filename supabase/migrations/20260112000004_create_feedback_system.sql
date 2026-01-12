-- Create feedback table for bug reports and feature requests
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('bug', 'feature')),
  subject text NOT NULL,
  description text NOT NULL,
  user_email text,
  user_agent text,
  page_url text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved', 'wont_fix')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_feedback_user ON public.user_feedback(user_id, created_at DESC);
CREATE INDEX idx_feedback_type ON public.user_feedback(feedback_type, created_at DESC);
CREATE INDEX idx_feedback_status ON public.user_feedback(status, created_at DESC);

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON public.user_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own feedback (service role handles email)
CREATE POLICY "Users can submit feedback"
  ON public.user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_feedback_updated_at
  BEFORE UPDATE ON public.user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();

COMMENT ON TABLE public.user_feedback IS 'User bug reports and feature requests';
COMMENT ON COLUMN public.user_feedback.feedback_type IS 'Type: bug or feature';
COMMENT ON COLUMN public.user_feedback.status IS 'Status: new, reviewing, resolved, wont_fix';
