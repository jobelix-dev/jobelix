-- Remove the INSERT policy approach - use service role instead
-- Users should NOT be able to insert purchase records directly
-- Only the webhook (using service role) should create/update purchases

-- No policy needed - service role bypasses RLS
