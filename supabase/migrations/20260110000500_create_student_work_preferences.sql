-- Migration: Create student_work_preferences table
-- Stores job search preferences and bot configuration for auto-apply feature

CREATE TABLE IF NOT EXISTS public.student_work_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Work location preferences
  remote_work BOOLEAN DEFAULT true,
  
  -- Experience level preferences (what levels they want to apply to)
  exp_internship BOOLEAN DEFAULT true,
  exp_entry BOOLEAN DEFAULT true,
  exp_associate BOOLEAN DEFAULT false,
  exp_mid_senior BOOLEAN DEFAULT false,
  exp_director BOOLEAN DEFAULT false,
  exp_executive BOOLEAN DEFAULT false,
  
  -- Job type preferences
  job_full_time BOOLEAN DEFAULT true,
  job_contract BOOLEAN DEFAULT false,
  job_part_time BOOLEAN DEFAULT false,
  job_temporary BOOLEAN DEFAULT false,
  job_internship BOOLEAN DEFAULT false,
  job_other BOOLEAN DEFAULT false,
  job_volunteer BOOLEAN DEFAULT false,
  
  -- Date posted filters
  date_all_time BOOLEAN DEFAULT false,
  date_month BOOLEAN DEFAULT true,
  date_week BOOLEAN DEFAULT true,
  date_24_hours BOOLEAN DEFAULT true,
  
  -- Search criteria (arrays)
  positions TEXT[] DEFAULT '{}',
  locations TEXT[] DEFAULT '{}',
  
  -- Blacklists
  company_blacklist TEXT[] DEFAULT '{}',
  title_blacklist TEXT[] DEFAULT '{}',
  
  -- Personal details for applications
  date_of_birth TEXT,
  pronouns TEXT,
  gender TEXT,
  is_veteran BOOLEAN DEFAULT false,
  has_disability BOOLEAN DEFAULT false,
  ethnicity TEXT,
  
  -- Work authorization
  eu_work_authorization BOOLEAN DEFAULT false,
  us_work_authorization BOOLEAN DEFAULT false,
  
  -- Work preferences
  in_person_work BOOLEAN DEFAULT true,
  open_to_relocation BOOLEAN DEFAULT false,
  willing_to_complete_assessments BOOLEAN DEFAULT true,
  willing_to_undergo_drug_tests BOOLEAN DEFAULT true,
  willing_to_undergo_background_checks BOOLEAN DEFAULT true,
  
  -- Availability
  notice_period TEXT,
  
  -- Salary expectations
  salary_expectation_usd INTEGER,
  
  CONSTRAINT student_work_preferences_student_unique UNIQUE (student_id)
);

-- Index for lookups
CREATE INDEX idx_student_work_preferences_student ON public.student_work_preferences(student_id);

-- Trigger to update updated_at
CREATE TRIGGER update_student_work_preferences_updated_at
  BEFORE UPDATE ON public.student_work_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies
ALTER TABLE public.student_work_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own work preferences"
  ON public.student_work_preferences FOR SELECT
  USING (student_id IN (SELECT id FROM public.student WHERE id = auth.uid()));

CREATE POLICY "Students can insert their own work preferences"
  ON public.student_work_preferences FOR INSERT
  WITH CHECK (student_id IN (SELECT id FROM public.student WHERE id = auth.uid()));

CREATE POLICY "Students can update their own work preferences"
  ON public.student_work_preferences FOR UPDATE
  USING (student_id IN (SELECT id FROM public.student WHERE id = auth.uid()))
  WITH CHECK (student_id IN (SELECT id FROM public.student WHERE id = auth.uid()));

CREATE POLICY "Students can delete their own work preferences"
  ON public.student_work_preferences FOR DELETE
  USING (student_id IN (SELECT id FROM public.student WHERE id = auth.uid()));

COMMENT ON TABLE public.student_work_preferences IS 'Job search preferences and auto-apply bot configuration';
COMMENT ON COLUMN public.student_work_preferences.positions IS 'Array of job position titles to search for (e.g., ["AI Research", "Software Engineer"])';
COMMENT ON COLUMN public.student_work_preferences.locations IS 'Array of preferred locations (e.g., ["Europe", "Remote"])';
COMMENT ON COLUMN public.student_work_preferences.company_blacklist IS 'Companies to exclude from applications';
COMMENT ON COLUMN public.student_work_preferences.title_blacklist IS 'Job title keywords to exclude';
