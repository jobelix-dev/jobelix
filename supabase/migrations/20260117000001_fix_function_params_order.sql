-- Fix parameter order for PostgREST compatibility
-- PostgREST expects parameters in alphabetical order

-- Recreate function with alphabetically ordered parameters
CREATE OR REPLACE FUNCTION public.count_recent_signups_from_ip(p_hours_ago integer DEFAULT 24, p_ip_address text)
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
