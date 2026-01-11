-- Create table to track IP addresses for rate limiting
CREATE TABLE IF NOT EXISTS "public"."signup_ip_tracking" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "ip_address" text NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "user_agent" text
);

-- Create index for fast IP lookups
CREATE INDEX IF NOT EXISTS "signup_ip_tracking_ip_address_idx" ON "public"."signup_ip_tracking"("ip_address");
CREATE INDEX IF NOT EXISTS "signup_ip_tracking_created_at_idx" ON "public"."signup_ip_tracking"("created_at");

-- Add comment
COMMENT ON TABLE "public"."signup_ip_tracking" IS 'Tracks IP addresses for signup rate limiting';

-- Function to count recent signups from an IP
CREATE OR REPLACE FUNCTION count_recent_signups_from_ip(
    p_ip_address text,
    p_hours_ago int DEFAULT 24
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    signup_count int;
BEGIN
    SELECT COUNT(*)
    INTO signup_count
    FROM signup_ip_tracking
    WHERE ip_address = p_ip_address
    AND created_at > (now() - (p_hours_ago || ' hours')::interval);
    
    RETURN signup_count;
END;
$$;

-- Function to clean old IP tracking records (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_ip_tracking()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM signup_ip_tracking
    WHERE created_at < (now() - interval '30 days');
END;
$$;

COMMENT ON FUNCTION count_recent_signups_from_ip IS 'Count signups from an IP address within the last X hours';
COMMENT ON FUNCTION cleanup_old_ip_tracking IS 'Remove IP tracking records older than 30 days';
