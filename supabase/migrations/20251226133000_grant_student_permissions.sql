-- Grant INSERT permission to authenticated role on student table
-- RLS policies alone are not enough, we also need GRANT permissions

GRANT INSERT ON public.student TO authenticated;
GRANT UPDATE ON public.student TO authenticated;
GRANT SELECT ON public.student TO authenticated;
