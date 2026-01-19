-- Fix parameter order for PostgREST compatibility
-- PostgREST expects parameters in alphabetical order
-- Note: Parameters with defaults must come AFTER parameters without defaults

-- Recreate function with correct parameter order (required params first, then optional with defaults)
CREATE OR REPLACE FUNCTION public.count_recent_signups_from_ip(p_ip_address text, p_hours_ago integer DEFAULT 24)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
