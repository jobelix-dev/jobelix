-- Add extended profile tables for students
-- Projects, Skills, Languages, Publications, Certifications/Awards, Social Links

-- =====================================================
-- PROJECT TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS "public"."project" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "student_id" uuid NOT NULL,
    "project_name" text NOT NULL,
    "description" text,
    "link" text,
    CONSTRAINT "project_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_student_id_fkey" FOREIGN KEY ("student_id") 
        REFERENCES "public"."student"("id") ON DELETE CASCADE
);

-- Add constraints
ALTER TABLE "public"."project"
ADD CONSTRAINT "project_name_check" CHECK (length(project_name) >= 1 AND length(project_name) <= 200),
ADD CONSTRAINT "project_description_check" CHECK (description IS NULL OR length(description) <= 1000),
ADD CONSTRAINT "project_link_check" CHECK (link IS NULL OR length(link) <= 500);

-- Add comments
COMMENT ON TABLE "public"."project" IS 'Student projects with optional links';
COMMENT ON COLUMN "public"."project"."project_name" IS 'Name of the project (required)';
COMMENT ON COLUMN "public"."project"."description" IS 'Project description (optional)';
COMMENT ON COLUMN "public"."project"."link" IS 'URL to project repository or demo (optional)';

-- Add index
CREATE INDEX "project_student_id_idx" ON "public"."project" USING btree ("student_id");


-- =====================================================
-- SKILL TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS "public"."skill" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "student_id" uuid NOT NULL,
    "skill_name" text NOT NULL,
    "skill_slug" text,
    CONSTRAINT "skill_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "skill_student_id_fkey" FOREIGN KEY ("student_id") 
        REFERENCES "public"."student"("id") ON DELETE CASCADE
);

-- Add constraints
ALTER TABLE "public"."skill"
ADD CONSTRAINT "skill_name_check" CHECK (length(skill_name) >= 1 AND length(skill_name) <= 100),
ADD CONSTRAINT "skill_slug_check" CHECK (skill_slug IS NULL OR length(skill_slug) <= 100);

-- Add comments
COMMENT ON TABLE "public"."skill" IS 'Student skills and competencies';
COMMENT ON COLUMN "public"."skill"."skill_name" IS 'Display name of the skill';
COMMENT ON COLUMN "public"."skill"."skill_slug" IS 'URL-friendly slug for filtering/search (optional)';

-- Add index
CREATE INDEX "skill_student_id_idx" ON "public"."skill" USING btree ("student_id");
CREATE INDEX "skill_slug_idx" ON "public"."skill" USING btree ("skill_slug") WHERE skill_slug IS NOT NULL;


-- =====================================================
-- LANGUAGE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS "public"."language" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "student_id" uuid NOT NULL,
    "language_name" text NOT NULL,
    "proficiency_level" text,
    CONSTRAINT "language_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "language_student_id_fkey" FOREIGN KEY ("student_id") 
        REFERENCES "public"."student"("id") ON DELETE CASCADE
);

-- Add constraints
ALTER TABLE "public"."language"
ADD CONSTRAINT "language_name_check" CHECK (length(language_name) >= 1 AND length(language_name) <= 100),
ADD CONSTRAINT "language_proficiency_check" CHECK (
    proficiency_level IS NULL OR 
    proficiency_level IN ('native', 'advanced', 'intermediate', 'beginner')
);

-- Add comments
COMMENT ON TABLE "public"."language" IS 'Student language proficiencies';
COMMENT ON COLUMN "public"."language"."language_name" IS 'Name of the language (e.g., English, French)';
COMMENT ON COLUMN "public"."language"."proficiency_level" IS 'Proficiency level: native, advanced, intermediate, beginner';

-- Add index
CREATE INDEX "language_student_id_idx" ON "public"."language" USING btree ("student_id");


-- =====================================================
-- PUBLICATION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS "public"."publication" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "student_id" uuid NOT NULL,
    "title" text NOT NULL,
    "journal_name" text,
    "description" text,
    "publication_year" integer,
    "publication_month" integer,
    "link" text,
    CONSTRAINT "publication_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "publication_student_id_fkey" FOREIGN KEY ("student_id") 
        REFERENCES "public"."student"("id") ON DELETE CASCADE
);

-- Add constraints
ALTER TABLE "public"."publication"
ADD CONSTRAINT "publication_title_check" CHECK (length(title) >= 1 AND length(title) <= 300),
ADD CONSTRAINT "publication_journal_check" CHECK (journal_name IS NULL OR length(journal_name) <= 200),
ADD CONSTRAINT "publication_description_check" CHECK (description IS NULL OR length(description) <= 1000),
ADD CONSTRAINT "publication_year_range" CHECK (publication_year IS NULL OR (publication_year >= 1950 AND publication_year <= 2050)),
ADD CONSTRAINT "publication_month_range" CHECK (publication_month IS NULL OR (publication_month >= 1 AND publication_month <= 12)),
ADD CONSTRAINT "publication_link_check" CHECK (link IS NULL OR length(link) <= 500);

-- Add comments
COMMENT ON TABLE "public"."publication" IS 'Student academic publications and research papers';
COMMENT ON COLUMN "public"."publication"."title" IS 'Publication title (required)';
COMMENT ON COLUMN "public"."publication"."journal_name" IS 'Journal or conference name (optional)';
COMMENT ON COLUMN "public"."publication"."description" IS 'Brief description or abstract (optional)';
COMMENT ON COLUMN "public"."publication"."publication_year" IS 'Year of publication (optional)';
COMMENT ON COLUMN "public"."publication"."publication_month" IS 'Month of publication 1-12 (optional)';
COMMENT ON COLUMN "public"."publication"."link" IS 'URL to publication (optional)';

-- Add index
CREATE INDEX "publication_student_id_idx" ON "public"."publication" USING btree ("student_id");


-- =====================================================
-- CERTIFICATION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS "public"."certification" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "student_id" uuid NOT NULL,
    "name" text NOT NULL,
    "issuing_organization" text,
    "description" text,
    "issue_year" integer,
    "issue_month" integer,
    "expiry_year" integer,
    "expiry_month" integer,
    "credential_id" text,
    "credential_url" text,
    CONSTRAINT "certification_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "certification_student_id_fkey" FOREIGN KEY ("student_id") 
        REFERENCES "public"."student"("id") ON DELETE CASCADE
);

-- Add constraints
ALTER TABLE "public"."certification"
ADD CONSTRAINT "certification_name_check" CHECK (length(name) >= 1 AND length(name) <= 200),
ADD CONSTRAINT "certification_organization_check" CHECK (issuing_organization IS NULL OR length(issuing_organization) <= 200),
ADD CONSTRAINT "certification_description_check" CHECK (description IS NULL OR length(description) <= 1000),
ADD CONSTRAINT "certification_issue_year_range" CHECK (issue_year IS NULL OR (issue_year >= 1950 AND issue_year <= 2050)),
ADD CONSTRAINT "certification_issue_month_range" CHECK (issue_month IS NULL OR (issue_month >= 1 AND issue_month <= 12)),
ADD CONSTRAINT "certification_expiry_year_range" CHECK (expiry_year IS NULL OR (expiry_year >= 1950 AND expiry_year <= 2100)),
ADD CONSTRAINT "certification_expiry_month_range" CHECK (expiry_month IS NULL OR (expiry_month >= 1 AND expiry_month <= 12)),
ADD CONSTRAINT "certification_credential_id_check" CHECK (credential_id IS NULL OR length(credential_id) <= 100),
ADD CONSTRAINT "certification_credential_url_check" CHECK (credential_url IS NULL OR length(credential_url) <= 500);

-- Add comments
COMMENT ON TABLE "public"."certification" IS 'Student certifications and awards';
COMMENT ON COLUMN "public"."certification"."name" IS 'Certification or award name (required)';
COMMENT ON COLUMN "public"."certification"."issuing_organization" IS 'Organization that issued the certification (optional)';
COMMENT ON COLUMN "public"."certification"."description" IS 'Description or details (optional)';
COMMENT ON COLUMN "public"."certification"."issue_year" IS 'Year issued (optional)';
COMMENT ON COLUMN "public"."certification"."issue_month" IS 'Month issued 1-12 (optional)';
COMMENT ON COLUMN "public"."certification"."expiry_year" IS 'Expiry year if applicable (optional)';
COMMENT ON COLUMN "public"."certification"."expiry_month" IS 'Expiry month 1-12 if applicable (optional)';
COMMENT ON COLUMN "public"."certification"."credential_id" IS 'Credential ID or license number (optional)';
COMMENT ON COLUMN "public"."certification"."credential_url" IS 'URL to verify credential (optional)';

-- Add index
CREATE INDEX "certification_student_id_idx" ON "public"."certification" USING btree ("student_id");


-- =====================================================
-- SOCIAL LINK TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS "public"."social_link" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "student_id" uuid NOT NULL,
    "platform" text NOT NULL,
    "url" text NOT NULL,
    CONSTRAINT "social_link_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "social_link_student_id_fkey" FOREIGN KEY ("student_id") 
        REFERENCES "public"."student"("id") ON DELETE CASCADE
);

-- Add constraints
ALTER TABLE "public"."social_link"
ADD CONSTRAINT "social_link_platform_check" CHECK (length(platform) >= 1 AND length(platform) <= 50),
ADD CONSTRAINT "social_link_url_check" CHECK (length(url) >= 1 AND length(url) <= 500),
ADD CONSTRAINT "social_link_platform_values" CHECK (
    platform IN ('LinkedIn', 'GitHub', 'Portfolio', 'Twitter', 'Website', 'Other')
);

-- Add comments
COMMENT ON TABLE "public"."social_link" IS 'Student social media and professional links';
COMMENT ON COLUMN "public"."social_link"."platform" IS 'Platform name (LinkedIn, GitHub, Portfolio, Twitter, Website, Other)';
COMMENT ON COLUMN "public"."social_link"."url" IS 'Full URL to profile or website';

-- Add indexes
CREATE INDEX "social_link_student_id_idx" ON "public"."social_link" USING btree ("student_id");
CREATE INDEX "social_link_platform_idx" ON "public"."social_link" USING btree ("platform");


-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE "public"."project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."skill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."language" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."publication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."certification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."social_link" ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - Students can only access their own data
-- =====================================================

-- PROJECT POLICIES
CREATE POLICY "Students can view their own projects" 
ON "public"."project" FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own projects" 
ON "public"."project" FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own projects" 
ON "public"."project" FOR UPDATE 
USING (auth.uid() = student_id);

CREATE POLICY "Students can delete their own projects" 
ON "public"."project" FOR DELETE 
USING (auth.uid() = student_id);

-- SKILL POLICIES
CREATE POLICY "Students can view their own skills" 
ON "public"."skill" FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own skills" 
ON "public"."skill" FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own skills" 
ON "public"."skill" FOR UPDATE 
USING (auth.uid() = student_id);

CREATE POLICY "Students can delete their own skills" 
ON "public"."skill" FOR DELETE 
USING (auth.uid() = student_id);

-- LANGUAGE POLICIES
CREATE POLICY "Students can view their own languages" 
ON "public"."language" FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own languages" 
ON "public"."language" FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own languages" 
ON "public"."language" FOR UPDATE 
USING (auth.uid() = student_id);

CREATE POLICY "Students can delete their own languages" 
ON "public"."language" FOR DELETE 
USING (auth.uid() = student_id);

-- PUBLICATION POLICIES
CREATE POLICY "Students can view their own publications" 
ON "public"."publication" FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own publications" 
ON "public"."publication" FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own publications" 
ON "public"."publication" FOR UPDATE 
USING (auth.uid() = student_id);

CREATE POLICY "Students can delete their own publications" 
ON "public"."publication" FOR DELETE 
USING (auth.uid() = student_id);

-- CERTIFICATION POLICIES
CREATE POLICY "Students can view their own certifications" 
ON "public"."certification" FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own certifications" 
ON "public"."certification" FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own certifications" 
ON "public"."certification" FOR UPDATE 
USING (auth.uid() = student_id);

CREATE POLICY "Students can delete their own certifications" 
ON "public"."certification" FOR DELETE 
USING (auth.uid() = student_id);

-- SOCIAL LINK POLICIES
CREATE POLICY "Students can view their own social links" 
ON "public"."social_link" FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own social links" 
ON "public"."social_link" FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own social links" 
ON "public"."social_link" FOR UPDATE 
USING (auth.uid() = student_id);

CREATE POLICY "Students can delete their own social links" 
ON "public"."social_link" FOR DELETE 
USING (auth.uid() = student_id);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON TABLE "public"."project" TO "authenticated";
GRANT ALL ON TABLE "public"."skill" TO "authenticated";
GRANT ALL ON TABLE "public"."language" TO "authenticated";
GRANT ALL ON TABLE "public"."publication" TO "authenticated";
GRANT ALL ON TABLE "public"."certification" TO "authenticated";
GRANT ALL ON TABLE "public"."social_link" TO "authenticated";
