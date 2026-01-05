-- Expand company_offer table with comprehensive fields for startup job matching
-- Based on startup-specific matching requirements

-- First, add new columns to the main company_offer table
ALTER TABLE company_offer
  -- Status and timestamps
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  ADD COLUMN IF NOT EXISTS published_at timestamp with time zone,
  
  -- Compensation
  ADD COLUMN IF NOT EXISTS salary_min integer,
  ADD COLUMN IF NOT EXISTS salary_max integer,
  ADD COLUMN IF NOT EXISTS salary_currency text DEFAULT 'EUR' CHECK (length(salary_currency) = 3),
  ADD COLUMN IF NOT EXISTS salary_period text CHECK (salary_period IN ('hour', 'day', 'month', 'year')),
  ADD COLUMN IF NOT EXISTS equity boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS equity_range text,
  
  -- Work mode
  ADD COLUMN IF NOT EXISTS remote_mode text CHECK (remote_mode IN ('onsite', 'hybrid', 'remote')),
  ADD COLUMN IF NOT EXISTS employment_type text CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern')),
  ADD COLUMN IF NOT EXISTS timezone_min text,
  ADD COLUMN IF NOT EXISTS timezone_max text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS availability text,
  
  -- Startup-specific matching signals
  ADD COLUMN IF NOT EXISTS problem_to_solve text,
  ADD COLUMN IF NOT EXISTS mission text,
  ADD COLUMN IF NOT EXISTS product_area text,
  ADD COLUMN IF NOT EXISTS stage text CHECK (stage IN ('preseed', 'seed', 'series_a', 'series_b', 'series_c', 'series_d', 'growth', 'public')),
  ADD COLUMN IF NOT EXISTS team_size integer,
  ADD COLUMN IF NOT EXISTS seniority text CHECK (seniority IN ('junior', 'mid', 'senior', 'lead', 'principal', 'staff')),
  ADD COLUMN IF NOT EXISTS priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  ADD COLUMN IF NOT EXISTS urgency text;

-- Add comments to main table
COMMENT ON COLUMN company_offer.status IS 'Offer publication status: draft, published, or closed';
COMMENT ON COLUMN company_offer.problem_to_solve IS 'What success looks like in 3-6 months - key matching signal';
COMMENT ON COLUMN company_offer.mission IS 'Company/team mission or product area';
COMMENT ON COLUMN company_offer.stage IS 'Startup funding stage';
COMMENT ON COLUMN company_offer.remote_mode IS 'Work location flexibility';
COMMENT ON COLUMN company_offer.employment_type IS 'Type of employment contract';

-- Create offer_skills table (must-have vs nice-to-have skills)
CREATE TABLE IF NOT EXISTS offer_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES company_offer(id) ON DELETE CASCADE,
  skill_slug text NOT NULL,
  skill_text text NOT NULL,
  importance text NOT NULL CHECK (importance IN ('must', 'nice')),
  level text,
  years integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_offer_skill UNIQUE(offer_id, skill_slug)
);

CREATE INDEX idx_offer_skills_offer_id ON offer_skills(offer_id);
CREATE INDEX idx_offer_skills_skill_slug ON offer_skills(skill_slug);
CREATE INDEX idx_offer_skills_importance ON offer_skills(importance);

COMMENT ON TABLE offer_skills IS 'Skills required or desired for job offers - matches student skills';
COMMENT ON COLUMN offer_skills.skill_slug IS 'Normalized skill identifier for matching';
COMMENT ON COLUMN offer_skills.importance IS 'must = required, nice = preferred';

-- Create offer_locations table (multiple locations per offer)
CREATE TABLE IF NOT EXISTS offer_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES company_offer(id) ON DELETE CASCADE,
  city text,
  country text,
  region text,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_offer_locations_offer_id ON offer_locations(offer_id);
CREATE INDEX idx_offer_locations_country ON offer_locations(country);
CREATE INDEX idx_offer_locations_city ON offer_locations(city);

COMMENT ON TABLE offer_locations IS 'Geographic locations where offer is available';
COMMENT ON COLUMN offer_locations.is_primary IS 'Main office/location for the role';

-- Create offer_responsibilities table (key tasks and outcomes)
CREATE TABLE IF NOT EXISTS offer_responsibilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES company_offer(id) ON DELETE CASCADE,
  text text NOT NULL,
  order_index integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_offer_responsibilities_offer_id ON offer_responsibilities(offer_id);

COMMENT ON TABLE offer_responsibilities IS 'Specific responsibilities and tasks for the role';
COMMENT ON COLUMN offer_responsibilities.order_index IS 'Display order for responsibilities';

-- Create offer_capabilities table (startup-style outcome-based requirements)
CREATE TABLE IF NOT EXISTS offer_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES company_offer(id) ON DELETE CASCADE,
  text text NOT NULL,
  importance text NOT NULL CHECK (importance IN ('must', 'nice')),
  order_index integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_offer_capabilities_offer_id ON offer_capabilities(offer_id);
CREATE INDEX idx_offer_capabilities_importance ON offer_capabilities(importance);

COMMENT ON TABLE offer_capabilities IS 'Outcome-based capabilities (e.g., "shipped to production", "comfortable with ambiguity")';
COMMENT ON COLUMN offer_capabilities.importance IS 'must = required capability, nice = preferred';

-- Create offer_questions table (screening questions)
CREATE TABLE IF NOT EXISTS offer_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES company_offer(id) ON DELETE CASCADE,
  question text NOT NULL,
  type text NOT NULL CHECK (type IN ('text', 'yesno', 'multiple_choice')),
  is_required boolean DEFAULT false,
  order_index integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_offer_questions_offer_id ON offer_questions(offer_id);

COMMENT ON TABLE offer_questions IS 'Screening questions to filter candidates';
COMMENT ON COLUMN offer_questions.type IS 'Question format: text response, yes/no, or multiple choice';

-- Create offer_perks table (benefits and perks)
CREATE TABLE IF NOT EXISTS offer_perks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES company_offer(id) ON DELETE CASCADE,
  text text NOT NULL,
  order_index integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_offer_perks_offer_id ON offer_perks(offer_id);

COMMENT ON TABLE offer_perks IS 'Benefits and perks offered with the position';

-- Add RLS policies for all new tables

-- offer_skills policies
ALTER TABLE offer_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can manage their offer skills"
  ON offer_skills
  FOR ALL
  TO authenticated
  USING (
    offer_id IN (
      SELECT id FROM company_offer 
      WHERE company_id = auth.uid()
    )
  )
  WITH CHECK (
    offer_id IN (
      SELECT id FROM company_offer 
      WHERE company_id = auth.uid()
    )
  );

CREATE POLICY "Students can view published offer skills"
  ON offer_skills
  FOR SELECT
  TO authenticated
  USING (
    offer_id IN (
      SELECT id FROM company_offer WHERE status = 'published'
    )
  );

-- offer_locations policies
ALTER TABLE offer_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can manage their offer locations"
  ON offer_locations
  FOR ALL
  TO authenticated
  USING (
    offer_id IN (
      SELECT id FROM company_offer 
      WHERE company_id = auth.uid()
    )
  )
  WITH CHECK (
    offer_id IN (
      SELECT id FROM company_offer 
      WHERE company_id = auth.uid()
    )
  );

CREATE POLICY "Students can view published offer locations"
  ON offer_locations
  FOR SELECT
  TO authenticated
  USING (
    offer_id IN (
      SELECT id FROM company_offer WHERE status = 'published'
    )
  );

-- offer_responsibilities policies
ALTER TABLE offer_responsibilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can manage their offer responsibilities"
  ON offer_responsibilities
  FOR ALL
  TO authenticated
  USING (
    offer_id IN (
      SELECT id FROM company_offer 
      WHERE company_id = auth.uid()
    )
  )
  WITH CHECK (
    offer_id IN (
      SELECT id FROM company_offer 
      WHERE company_id = auth.uid()
    )
  );

CREATE POLICY "Students can view published offer responsibilities"
  ON offer_responsibilities
  FOR SELECT
  TO authenticated
  USING (
    offer_id IN (
      SELECT id FROM company_offer WHERE status = 'published'
    )
  );

-- offer_capabilities policies
ALTER TABLE offer_capabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can manage their offer capabilities"
  ON offer_capabilities
  FOR ALL
  TO authenticated
  USING (
    offer_id IN (
      SELECT id FROM company_offer 
      WHERE company_id = auth.uid()
    )
  )
  WITH CHECK (
    offer_id IN (
      SELECT id FROM company_offer 
      WHERE company_id = auth.uid()
    )
  );

CREATE POLICY "Students can view published offer capabilities"
  ON offer_capabilities
  FOR SELECT
  TO authenticated
  USING (
    offer_id IN (
      SELECT id FROM company_offer WHERE status = 'published'
    )
  );

-- offer_questions policies
ALTER TABLE offer_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can manage their offer questions"
  ON offer_questions
  FOR ALL
  TO authenticated
  USING (
    offer_id IN (
      SELECT id FROM company_offer 
      WHERE company_id = auth.uid()
    )
  )
  WITH CHECK (
    offer_id IN (
      SELECT id FROM company_offer 
      WHERE company_id = auth.uid()
    )
  );

CREATE POLICY "Students can view published offer questions"
  ON offer_questions
  FOR SELECT
  TO authenticated
  USING (
    offer_id IN (
      SELECT id FROM company_offer WHERE status = 'published'
    )
  );

-- offer_perks policies
ALTER TABLE offer_perks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can manage their offer perks"
  ON offer_perks
  FOR ALL
  TO authenticated
  USING (
    offer_id IN (
      SELECT id FROM company_offer 
      WHERE company_id = auth.uid()
    )
  )
  WITH CHECK (
    offer_id IN (
      SELECT id FROM company_offer 
      WHERE company_id = auth.uid()
    )
  );

CREATE POLICY "Students can view published offer perks"
  ON offer_perks
  FOR SELECT
  TO authenticated
  USING (
    offer_id IN (
      SELECT id FROM company_offer WHERE status = 'published'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON offer_skills TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON offer_locations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON offer_responsibilities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON offer_capabilities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON offer_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON offer_perks TO authenticated;
