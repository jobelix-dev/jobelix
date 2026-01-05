-- Add extended profile fields to student_profile_draft table
-- These will be stored as JSONB arrays, same pattern as education and experience

ALTER TABLE "public"."student_profile_draft"
ADD COLUMN "projects" jsonb DEFAULT '[]'::jsonb,
ADD COLUMN "skills" jsonb DEFAULT '[]'::jsonb,
ADD COLUMN "languages" jsonb DEFAULT '[]'::jsonb,
ADD COLUMN "publications" jsonb DEFAULT '[]'::jsonb,
ADD COLUMN "certifications" jsonb DEFAULT '[]'::jsonb,
ADD COLUMN "social_links" jsonb DEFAULT '[]'::jsonb;

-- Add comments
COMMENT ON COLUMN "public"."student_profile_draft"."projects" IS 'Array of projects: [{project_name, description, link}]';
COMMENT ON COLUMN "public"."student_profile_draft"."skills" IS 'Array of skills: [{skill_name, skill_slug}]';
COMMENT ON COLUMN "public"."student_profile_draft"."languages" IS 'Array of languages: [{language_name, proficiency_level}]';
COMMENT ON COLUMN "public"."student_profile_draft"."publications" IS 'Array of publications: [{title, journal_name, description, publication_year, publication_month, link}]';
COMMENT ON COLUMN "public"."student_profile_draft"."certifications" IS 'Array of certifications: [{name, issuing_organization, description, issue_year, issue_month, expiry_year, expiry_month, credential_id, credential_url}]';
COMMENT ON COLUMN "public"."student_profile_draft"."social_links" IS 'Array of social links: [{platform, url}]';
