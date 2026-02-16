-- ============================================================================
-- Migration: Fix Resume Count to Only Include User-Associated Resumes
-- Description: Updates the analytics_daily_snapshot view to only count
--              resumes that are associated with valid users in auth.users
--              by joining through student table
-- Date: 2026-02-13
-- ============================================================================

-- Drop and recreate the view with the corrected logic
CREATE OR REPLACE VIEW public.analytics_daily_snapshot AS
WITH date_series AS (
  -- Generate a series of dates from the first user registration to today
  SELECT generate_series(
    COALESCE((SELECT DATE(MIN(created_at)) FROM auth.users), CURRENT_DATE),
    CURRENT_DATE,
    '1 day'::interval
  )::date AS date
),
daily_registered_users AS (
  -- Count new users registered each day
  SELECT 
    DATE(created_at) AS date,
    COUNT(*) AS count
  FROM auth.users
  GROUP BY DATE(created_at)
),
daily_resume_uploads AS (
  -- Count users who uploaded resumes each day (only resumes associated with valid users)
  SELECT 
    DATE(r.created_at) AS date,
    COUNT(DISTINCT r.student_id) AS count
  FROM public.resume r
  INNER JOIN public.student s ON r.student_id = s.id
  INNER JOIN auth.users u ON s.mail_adress = u.email
  GROUP BY DATE(r.created_at)
),
daily_active_bot_users AS (
  -- Count active bot users each day (users who have used API tokens)
  -- We consider someone "active" if they've ever used the API
  SELECT 
    DATE(at.last_used_at) AS date,
    COUNT(DISTINCT at.user_id) AS count
  FROM public.api_tokens at
  WHERE at.last_used_at IS NOT NULL
  GROUP BY DATE(at.last_used_at)
),
daily_token_purchases AS (
  -- Count completed token purchases each day
  SELECT 
    DATE(completed_at) AS date,
    COUNT(*) AS count
  FROM public.credit_purchases
  WHERE status = 'completed' 
    AND completed_at IS NOT NULL
  GROUP BY DATE(completed_at)
),
daily_long_term_users_1h AS (
  -- Count users where last_used - created > 1 hour (first time crossing threshold)
  SELECT 
    DATE(at.last_used_at) AS date,
    COUNT(DISTINCT at.user_id) AS count
  FROM public.api_tokens at
  INNER JOIN auth.users u ON at.user_id = u.id
  WHERE at.last_used_at IS NOT NULL
    AND (at.last_used_at - u.created_at) > INTERVAL '1 hour'
    AND DATE(at.last_used_at) >= DATE(u.created_at + INTERVAL '1 hour')
  GROUP BY DATE(at.last_used_at)
),
daily_long_term_users_24h AS (
  -- Count users where last_used - created > 24 hours (first time crossing threshold)
  SELECT 
    DATE(at.last_used_at) AS date,
    COUNT(DISTINCT at.user_id) AS count
  FROM public.api_tokens at
  INNER JOIN auth.users u ON at.user_id = u.id
  WHERE at.last_used_at IS NOT NULL
    AND (at.last_used_at - u.created_at) > INTERVAL '24 hours'
    AND DATE(at.last_used_at) >= DATE(u.created_at + INTERVAL '24 hours')
  GROUP BY DATE(at.last_used_at)
)
-- Main query: Join all metrics and calculate cumulative sums
SELECT 
  ds.date,
  -- Daily counts (non-cumulative)
  COALESCE(dru.count, 0) AS daily_registered_users,
  COALESCE(dres.count, 0) AS daily_resume_uploads,
  COALESCE(dabu.count, 0) AS daily_active_bot_users,
  COALESCE(dtp.count, 0) AS daily_token_purchases,
  COALESCE(dlt1.count, 0) AS daily_long_term_1h,
  COALESCE(dlt24.count, 0) AS daily_long_term_24h,
  
  -- Cumulative counts using window functions
  SUM(COALESCE(dru.count, 0)) OVER (ORDER BY ds.date) AS cumulative_registered_users,
  SUM(COALESCE(dres.count, 0)) OVER (ORDER BY ds.date) AS cumulative_resume_uploads,
  SUM(COALESCE(dabu.count, 0)) OVER (ORDER BY ds.date) AS cumulative_active_bot_users,
  SUM(COALESCE(dtp.count, 0)) OVER (ORDER BY ds.date) AS cumulative_token_purchases,
  SUM(COALESCE(dlt1.count, 0)) OVER (ORDER BY ds.date) AS cumulative_long_term_1h,
  SUM(COALESCE(dlt24.count, 0)) OVER (ORDER BY ds.date) AS cumulative_long_term_24h
FROM date_series ds
LEFT JOIN daily_registered_users dru ON ds.date = dru.date
LEFT JOIN daily_resume_uploads dres ON ds.date = dres.date
LEFT JOIN daily_active_bot_users dabu ON ds.date = dabu.date
LEFT JOIN daily_token_purchases dtp ON ds.date = dtp.date
LEFT JOIN daily_long_term_users_1h dlt1 ON ds.date = dlt1.date
LEFT JOIN daily_long_term_users_24h dlt24 ON ds.date = dlt24.date
ORDER BY ds.date;

-- Update the comment
COMMENT ON VIEW public.analytics_daily_snapshot IS 
'Daily growth and engagement metrics with cumulative totals for dashboard visualization. Resumes are counted only if associated with valid users.';
