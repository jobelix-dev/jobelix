-- Add stripe_event_id for idempotent webhook processing
-- This is the best way to prevent duplicate credits when Stripe retries webhooks

ALTER TABLE public.credit_purchases
ADD COLUMN IF NOT EXISTS stripe_event_id TEXT UNIQUE;

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_purchases_event_id ON public.credit_purchases(stripe_event_id);

COMMENT ON COLUMN public.credit_purchases.stripe_event_id IS 'Stripe webhook event ID for idempotent processing';
