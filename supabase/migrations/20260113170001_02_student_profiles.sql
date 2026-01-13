-- =====================================================================
-- Migration: Student Profiles and Related Tables
-- Description: Creates all student-related tables including student,
--              student_profile_draft, and all normalized profile tables
--              (academic, experience, project, skill, language, 
--              publication, certification, social_link, resume).
--              Includes the finalize_student_profile() function that
--              transforms draft JSONB data into normalized tables.
-- =====================================================================

-- =====================================================================
-- STUDENT TABLES
-- =====================================================================

create table "public"."student" (
  "id" uuid not null default gen_random_uuid(),
  "created_at" timestamp with time zone not null default now(),
  "mail_adress" text not null,
  "description" text,
  "first_name" text,
  "last_name" text,
  "phone_number" text,
  "address" text,
  "student_name" text
);

alter table "public"."student" enable row level security;

create table "public"."student_profile_draft" (
  "id" uuid not null default gen_random_uuid(),
  "student_id" uuid not null,
  "raw_resume_text" text,
  "student_name" text,
  "education" jsonb default '[]'::jsonb,
  "experience" jsonb default '[]'::jsonb,
  "chat_history" jsonb default '[]'::jsonb,
  "status" text default 'editing'::text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "phone_number" text,
  "email" text,
  "address" text,
  "projects" jsonb default '[]'::jsonb,
  "skills" jsonb default '[]'::jsonb,
  "languages" jsonb default '[]'::jsonb,
  "publications" jsonb default '[]'::jsonb,
  "certifications" jsonb default '[]'::jsonb,
  "social_links" jsonb default '{}'::jsonb
);

alter table "public"."student_profile_draft" enable row level security;

-- =====================================================================
-- NORMALIZED PROFILE TABLES
-- =====================================================================

create table "public"."academic" (
  "id" uuid not null default gen_random_uuid(),
  "created_at" timestamp with time zone not null default now(),
  "student_id" uuid not null default gen_random_uuid(),
  "school_name" text not null,
  "degree" text not null,
  "description" text,
  "start_year" integer,
  "start_month" integer,
  "end_year" integer,
  "end_month" integer
);

alter table "public"."academic" enable row level security;

create table "public"."experience" (
  "id" uuid not null default gen_random_uuid(),
  "created_at" timestamp with time zone not null default now(),
  "student_id" uuid not null default gen_random_uuid(),
  "organisation_name" text not null,
  "position_name" text not null,
  "description" text,
  "start_year" integer,
  "start_month" integer,
  "end_year" integer,
  "end_month" integer
);

alter table "public"."experience" enable row level security;

create table "public"."project" (
  "id" uuid not null default gen_random_uuid(),
  "created_at" timestamp with time zone not null default now(),
  "student_id" uuid not null,
  "project_name" text not null,
  "description" text,
  "link" text
);

alter table "public"."project" enable row level security;

create table "public"."skill" (
  "id" uuid not null default gen_random_uuid(),
  "created_at" timestamp with time zone not null default now(),
  "student_id" uuid not null,
  "skill_name" text not null,
  "skill_slug" text
);

alter table "public"."skill" enable row level security;

create table "public"."language" (
  "id" uuid not null default gen_random_uuid(),
  "created_at" timestamp with time zone not null default now(),
  "student_id" uuid not null,
  "language_name" text not null,
  "proficiency_level" text
);

alter table "public"."language" enable row level security;

create table "public"."publication" (
  "id" uuid not null default gen_random_uuid(),
  "created_at" timestamp with time zone not null default now(),
  "student_id" uuid not null,
  "title" text not null,
  "journal_name" text,
  "description" text,
  "publication_year" integer,
  "publication_month" integer,
  "link" text
);

alter table "public"."publication" enable row level security;

create table "public"."certification" (
  "id" uuid not null default gen_random_uuid(),
  "created_at" timestamp with time zone not null default now(),
  "student_id" uuid not null,
  "name" text not null,
  "issuing_organization" text,
  "url" text
);

alter table "public"."certification" enable row level security;

create table "public"."social_link" (
  "id" uuid not null default gen_random_uuid(),
  "created_at" timestamp with time zone not null default now(),
  "student_id" uuid not null,
  "github" text,
  "linkedin" text,
  "stackoverflow" text,
  "kaggle" text,
  "leetcode" text
);

alter table "public"."social_link" enable row level security;

create table "public"."resume" (
  "created_at" timestamp with time zone not null default now(),
  "student_id" uuid not null,
  "file_name" text not null
);

alter table "public"."resume" enable row level security;

-- =====================================================================
-- INDEXES
-- =====================================================================

CREATE UNIQUE INDEX academic_pkey ON public.academic USING btree (id);
CREATE UNIQUE INDEX certification_pkey ON public.certification USING btree (id);
CREATE INDEX certification_student_id_idx ON public.certification USING btree (student_id);
CREATE UNIQUE INDEX experience_pkey ON public.experience USING btree (id);
CREATE UNIQUE INDEX language_pkey ON public.language USING btree (id);
CREATE INDEX language_student_id_idx ON public.language USING btree (student_id);
CREATE UNIQUE INDEX project_pkey ON public.project USING btree (id);
CREATE INDEX project_student_id_idx ON public.project USING btree (student_id);
CREATE UNIQUE INDEX publication_pkey ON public.publication USING btree (id);
CREATE INDEX publication_student_id_idx ON public.publication USING btree (student_id);
CREATE UNIQUE INDEX resume_pkey ON public.resume USING btree (student_id);
CREATE UNIQUE INDEX skill_pkey ON public.skill USING btree (id);
CREATE INDEX skill_slug_idx ON public.skill USING btree (skill_slug) WHERE (skill_slug IS NOT NULL);
CREATE INDEX skill_student_id_idx ON public.skill USING btree (student_id);
CREATE UNIQUE INDEX social_link_pkey ON public.social_link USING btree (id);
CREATE INDEX social_link_student_id_idx ON public.social_link USING btree (student_id);
CREATE UNIQUE INDEX student_pkey ON public.student USING btree (id);
CREATE UNIQUE INDEX student_profile_draft_pkey ON public.student_profile_draft USING btree (id);
CREATE INDEX student_profile_draft_student_id_idx ON public.student_profile_draft USING btree (student_id);
CREATE UNIQUE INDEX student_profile_draft_student_id_key ON public.student_profile_draft USING btree (student_id);
CREATE INDEX idx_student_mail_adress ON public.student USING btree (mail_adress);

-- =====================================================================
-- PRIMARY KEY CONSTRAINTS
-- =====================================================================

alter table "public"."academic" add constraint "academic_pkey" PRIMARY KEY using index "academic_pkey";
alter table "public"."certification" add constraint "certification_pkey" PRIMARY KEY using index "certification_pkey";
alter table "public"."experience" add constraint "experience_pkey" PRIMARY KEY using index "experience_pkey";
alter table "public"."language" add constraint "language_pkey" PRIMARY KEY using index "language_pkey";
alter table "public"."project" add constraint "project_pkey" PRIMARY KEY using index "project_pkey";
alter table "public"."publication" add constraint "publication_pkey" PRIMARY KEY using index "publication_pkey";
alter table "public"."resume" add constraint "resume_pkey" PRIMARY KEY using index "resume_pkey";
alter table "public"."skill" add constraint "skill_pkey" PRIMARY KEY using index "skill_pkey";
alter table "public"."social_link" add constraint "social_link_pkey" PRIMARY KEY using index "social_link_pkey";
alter table "public"."student" add constraint "student_pkey" PRIMARY KEY using index "student_pkey";
alter table "public"."student_profile_draft" add constraint "student_profile_draft_pkey" PRIMARY KEY using index "student_profile_draft_pkey";

-- =====================================================================
-- CHECK CONSTRAINTS
-- =====================================================================

alter table "public"."academic" add constraint "academic_end_month_range" CHECK (((end_month IS NULL) OR ((end_month >= 1) AND (end_month <= 12)))) not valid;
alter table "public"."academic" validate constraint "academic_end_month_range";
alter table "public"."academic" add constraint "academic_end_year_range" CHECK (((end_year IS NULL) OR ((end_year >= 1950) AND (end_year <= 2050)))) not valid;
alter table "public"."academic" validate constraint "academic_end_year_range";
alter table "public"."academic" add constraint "academic_start_month_range" CHECK (((start_month IS NULL) OR ((start_month >= 1) AND (start_month <= 12)))) not valid;
alter table "public"."academic" validate constraint "academic_start_month_range";
alter table "public"."academic" add constraint "academic_start_month_required" CHECK ((start_month IS NOT NULL)) not valid;
alter table "public"."academic" validate constraint "academic_start_month_required";
alter table "public"."academic" add constraint "academic_start_year_range" CHECK (((start_year IS NULL) OR ((start_year >= 1950) AND (start_year <= 2050)))) not valid;
alter table "public"."academic" validate constraint "academic_start_year_range";
alter table "public"."academic" add constraint "academic_start_year_required" CHECK ((start_year IS NOT NULL)) not valid;
alter table "public"."academic" validate constraint "academic_start_year_required";

alter table "public"."certification" add constraint "certification_name_check" CHECK (((length(name) >= 1) AND (length(name) <= 200))) not valid;
alter table "public"."certification" validate constraint "certification_name_check";
alter table "public"."certification" add constraint "certification_organization_check" CHECK (((issuing_organization IS NULL) OR (length(issuing_organization) <= 200))) not valid;
alter table "public"."certification" validate constraint "certification_organization_check";
alter table "public"."certification" add constraint "certification_url_check" CHECK (((url IS NULL) OR (length(url) <= 500))) not valid;
alter table "public"."certification" validate constraint "certification_url_check";

alter table "public"."experience" add constraint "experience_end_month_range" CHECK (((end_month IS NULL) OR ((end_month >= 1) AND (end_month <= 12)))) not valid;
alter table "public"."experience" validate constraint "experience_end_month_range";
alter table "public"."experience" add constraint "experience_end_year_range" CHECK (((end_year IS NULL) OR ((end_year >= 1950) AND (end_year <= 2050)))) not valid;
alter table "public"."experience" validate constraint "experience_end_year_range";
alter table "public"."experience" add constraint "experience_start_month_range" CHECK (((start_month IS NULL) OR ((start_month >= 1) AND (start_month <= 12)))) not valid;
alter table "public"."experience" validate constraint "experience_start_month_range";
alter table "public"."experience" add constraint "experience_start_month_required" CHECK ((start_month IS NOT NULL)) not valid;
alter table "public"."experience" validate constraint "experience_start_month_required";
alter table "public"."experience" add constraint "experience_start_year_range" CHECK (((start_year IS NULL) OR ((start_year >= 1950) AND (start_year <= 2050)))) not valid;
alter table "public"."experience" validate constraint "experience_start_year_range";
alter table "public"."experience" add constraint "experience_start_year_required" CHECK ((start_year IS NOT NULL)) not valid;
alter table "public"."experience" validate constraint "experience_start_year_required";

alter table "public"."language" add constraint "language_name_check" CHECK (((length(language_name) >= 1) AND (length(language_name) <= 100))) not valid;
alter table "public"."language" validate constraint "language_name_check";
alter table "public"."language" add constraint "language_proficiency_check" CHECK (((proficiency_level IS NULL) OR (proficiency_level = ANY (ARRAY['Beginner'::text, 'Intermediate'::text, 'Advanced'::text, 'Fluent'::text, 'Native'::text])))) not valid;
alter table "public"."language" validate constraint "language_proficiency_check";

alter table "public"."project" add constraint "project_description_check" CHECK (((description IS NULL) OR (length(description) <= 1000))) not valid;
alter table "public"."project" validate constraint "project_description_check";
alter table "public"."project" add constraint "project_link_check" CHECK (((link IS NULL) OR (length(link) <= 500))) not valid;
alter table "public"."project" validate constraint "project_link_check";
alter table "public"."project" add constraint "project_name_check" CHECK (((length(project_name) >= 1) AND (length(project_name) <= 200))) not valid;
alter table "public"."project" validate constraint "project_name_check";

alter table "public"."publication" add constraint "publication_description_check" CHECK (((description IS NULL) OR (length(description) <= 1000))) not valid;
alter table "public"."publication" validate constraint "publication_description_check";
alter table "public"."publication" add constraint "publication_journal_check" CHECK (((journal_name IS NULL) OR (length(journal_name) <= 200))) not valid;
alter table "public"."publication" validate constraint "publication_journal_check";
alter table "public"."publication" add constraint "publication_link_check" CHECK (((link IS NULL) OR (length(link) <= 500))) not valid;
alter table "public"."publication" validate constraint "publication_link_check";
alter table "public"."publication" add constraint "publication_month_range" CHECK (((publication_month IS NULL) OR ((publication_month >= 1) AND (publication_month <= 12)))) not valid;
alter table "public"."publication" validate constraint "publication_month_range";
alter table "public"."publication" add constraint "publication_title_check" CHECK (((length(title) >= 1) AND (length(title) <= 300))) not valid;
alter table "public"."publication" validate constraint "publication_title_check";
alter table "public"."publication" add constraint "publication_year_range" CHECK (((publication_year IS NULL) OR ((publication_year >= 1950) AND (publication_year <= 2050)))) not valid;
alter table "public"."publication" validate constraint "publication_year_range";

alter table "public"."skill" add constraint "skill_name_check" CHECK (((length(skill_name) >= 1) AND (length(skill_name) <= 100))) not valid;
alter table "public"."skill" validate constraint "skill_name_check";
alter table "public"."skill" add constraint "skill_slug_check" CHECK (((skill_slug IS NULL) OR (length(skill_slug) <= 100))) not valid;
alter table "public"."skill" validate constraint "skill_slug_check";

alter table "public"."social_link" add constraint "social_link_github_check" CHECK (((github IS NULL) OR ((length(github) >= 1) AND (length(github) <= 500)))) not valid;
alter table "public"."social_link" validate constraint "social_link_github_check";
alter table "public"."social_link" add constraint "social_link_kaggle_check" CHECK (((kaggle IS NULL) OR ((length(kaggle) >= 1) AND (length(kaggle) <= 500)))) not valid;
alter table "public"."social_link" validate constraint "social_link_kaggle_check";
alter table "public"."social_link" add constraint "social_link_leetcode_check" CHECK (((leetcode IS NULL) OR ((length(leetcode) >= 1) AND (length(leetcode) <= 500)))) not valid;
alter table "public"."social_link" validate constraint "social_link_leetcode_check";
alter table "public"."social_link" add constraint "social_link_linkedin_check" CHECK (((linkedin IS NULL) OR ((length(linkedin) >= 1) AND (length(linkedin) <= 500)))) not valid;
alter table "public"."social_link" validate constraint "social_link_linkedin_check";
alter table "public"."social_link" add constraint "social_link_stackoverflow_check" CHECK (((stackoverflow IS NULL) OR ((length(stackoverflow) >= 1) AND (length(stackoverflow) <= 500)))) not valid;
alter table "public"."social_link" validate constraint "social_link_stackoverflow_check";

alter table "public"."student" add constraint "student_address_check" CHECK ((length(address) <= 200)) not valid;
alter table "public"."student" validate constraint "student_address_check";
alter table "public"."student" add constraint "student_description_check" CHECK ((length(description) <= 500)) not valid;
alter table "public"."student" validate constraint "student_description_check";
alter table "public"."student" add constraint "student_first_name_check" CHECK ((length(first_name) <= 50)) not valid;
alter table "public"."student" validate constraint "student_first_name_check";
alter table "public"."student" add constraint "student_last_name_check" CHECK ((length(last_name) <= 50)) not valid;
alter table "public"."student" validate constraint "student_last_name_check";
alter table "public"."student" add constraint "student_phone_number_check" CHECK ((length(phone_number) <= 20)) not valid;
alter table "public"."student" validate constraint "student_phone_number_check";

alter table "public"."student_profile_draft" add constraint "student_profile_draft_address_check" CHECK ((length(address) <= 200)) not valid;
alter table "public"."student_profile_draft" validate constraint "student_profile_draft_address_check";
alter table "public"."student_profile_draft" add constraint "student_profile_draft_status_check" CHECK ((status = ANY (ARRAY['editing'::text, 'published'::text]))) not valid;
alter table "public"."student_profile_draft" validate constraint "student_profile_draft_status_check";

-- =====================================================================
-- FOREIGN KEY CONSTRAINTS
-- =====================================================================

alter table "public"."academic" add constraint "academic_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.student(id) ON UPDATE RESTRICT ON DELETE CASCADE not valid;
alter table "public"."academic" validate constraint "academic_student_id_fkey";

alter table "public"."certification" add constraint "certification_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.student(id) ON DELETE CASCADE not valid;
alter table "public"."certification" validate constraint "certification_student_id_fkey";

alter table "public"."experience" add constraint "experience_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.student(id) ON UPDATE RESTRICT ON DELETE CASCADE not valid;
alter table "public"."experience" validate constraint "experience_student_id_fkey";

alter table "public"."language" add constraint "language_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.student(id) ON DELETE CASCADE not valid;
alter table "public"."language" validate constraint "language_student_id_fkey";

alter table "public"."project" add constraint "project_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.student(id) ON DELETE CASCADE not valid;
alter table "public"."project" validate constraint "project_student_id_fkey";

alter table "public"."publication" add constraint "publication_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.student(id) ON DELETE CASCADE not valid;
alter table "public"."publication" validate constraint "publication_student_id_fkey";

alter table "public"."resume" add constraint "resume_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.student(id) ON UPDATE RESTRICT ON DELETE CASCADE not valid;
alter table "public"."resume" validate constraint "resume_student_id_fkey";

alter table "public"."skill" add constraint "skill_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.student(id) ON DELETE CASCADE not valid;
alter table "public"."skill" validate constraint "skill_student_id_fkey";

alter table "public"."social_link" add constraint "social_link_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.student(id) ON DELETE CASCADE not valid;
alter table "public"."social_link" validate constraint "social_link_student_id_fkey";

alter table "public"."student" add constraint "student_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON UPDATE RESTRICT ON DELETE CASCADE not valid;
alter table "public"."student" validate constraint "student_id_fkey";

alter table "public"."student_profile_draft" add constraint "student_profile_draft_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.student(id) ON DELETE CASCADE not valid;
alter table "public"."student_profile_draft" validate constraint "student_profile_draft_student_id_fkey";
alter table "public"."student_profile_draft" add constraint "student_profile_draft_student_id_key" UNIQUE using index "student_profile_draft_student_id_key";

-- =====================================================================
-- FUNCTION: finalize_student_profile()
-- Description: Transforms draft JSONB data into normalized tables.
--              This is the complete function that handles all profile
--              data including education, experience, projects, skills,
--              languages, publications, certifications, and social links.
-- =====================================================================

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.finalize_student_profile(p_user_id uuid, p_profile jsonb, p_education jsonb, p_experience jsonb, p_projects jsonb, p_skills jsonb, p_languages jsonb, p_publications jsonb, p_certifications jsonb, p_social_links jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_education_count int;
  v_experience_count int;
  v_projects_count int;
  v_skills_count int;
  v_languages_count int;
  v_publications_count int;
  v_certifications_count int;
  v_social_links_count int;
BEGIN
  -- Upsert student record
  INSERT INTO student (
    id,
    student_name,
    first_name,
    last_name,
    mail_adress,
    phone_number,
    address
  )
  VALUES (
    p_user_id,
    (p_profile->>'student_name')::text,
    (p_profile->>'first_name')::text,
    (p_profile->>'last_name')::text,
    (p_profile->>'mail_adress')::text,
    (p_profile->>'phone_number')::text,
    (p_profile->>'address')::text
  )
  ON CONFLICT (id) DO UPDATE SET
    student_name = EXCLUDED.student_name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    mail_adress = EXCLUDED.mail_adress,
    phone_number = EXCLUDED.phone_number,
    address = EXCLUDED.address;
  
  -- Delete existing related records before inserting new ones
  DELETE FROM academic WHERE student_id = p_user_id;
  DELETE FROM experience WHERE student_id = p_user_id;
  DELETE FROM project WHERE student_id = p_user_id;
  DELETE FROM skill WHERE student_id = p_user_id;
  DELETE FROM language WHERE student_id = p_user_id;
  DELETE FROM publication WHERE student_id = p_user_id;
  DELETE FROM certification WHERE student_id = p_user_id;
  DELETE FROM social_link WHERE student_id = p_user_id;
  
  -- Insert education records
  INSERT INTO academic (
    student_id,
    school_name,
    degree,
    description,
    start_year,
    start_month,
    end_year,
    end_month
  )
  SELECT 
    p_user_id,
    (elem->>'school_name')::text,
    (elem->>'degree')::text,
    (elem->>'description')::text,
    (elem->>'start_year')::int,
    (elem->>'start_month')::int,
    (elem->>'end_year')::int,
    (elem->>'end_month')::int
  FROM jsonb_array_elements(p_education) AS elem
  WHERE (elem->>'school_name')::text IS NOT NULL 
    AND (elem->>'school_name')::text != ''
    AND (elem->>'degree')::text IS NOT NULL 
    AND (elem->>'degree')::text != '';
  
  GET DIAGNOSTICS v_education_count = ROW_COUNT;
  
  -- Insert experience records
  INSERT INTO experience (
    student_id,
    organisation_name,
    position_name,
    description,
    start_year,
    start_month,
    end_year,
    end_month
  )
  SELECT 
    p_user_id,
    (elem->>'organisation_name')::text,
    (elem->>'position_name')::text,
    (elem->>'description')::text,
    (elem->>'start_year')::int,
    (elem->>'start_month')::int,
    (elem->>'end_year')::int,
    (elem->>'end_month')::int
  FROM jsonb_array_elements(p_experience) AS elem
  WHERE (elem->>'organisation_name')::text IS NOT NULL 
    AND (elem->>'organisation_name')::text != ''
    AND (elem->>'position_name')::text IS NOT NULL 
    AND (elem->>'position_name')::text != '';
  
  GET DIAGNOSTICS v_experience_count = ROW_COUNT;
  
  -- Insert project records
  INSERT INTO project (
    student_id,
    project_name,
    description,
    link
  )
  SELECT 
    p_user_id,
    (elem->>'project_name')::text,
    (elem->>'description')::text,
    (elem->>'link')::text
  FROM jsonb_array_elements(p_projects) AS elem
  WHERE (elem->>'project_name')::text IS NOT NULL 
    AND (elem->>'project_name')::text != '';
  
  GET DIAGNOSTICS v_projects_count = ROW_COUNT;
  
  -- Insert skill records
  INSERT INTO skill (
    student_id,
    skill_name,
    skill_slug
  )
  SELECT 
    p_user_id,
    (elem->>'skill_name')::text,
    (elem->>'skill_slug')::text
  FROM jsonb_array_elements(p_skills) AS elem
  WHERE (elem->>'skill_name')::text IS NOT NULL 
    AND (elem->>'skill_name')::text != ''
    AND (elem->>'skill_slug')::text IS NOT NULL 
    AND (elem->>'skill_slug')::text != '';
  
  GET DIAGNOSTICS v_skills_count = ROW_COUNT;
  
  -- Insert language records
  INSERT INTO language (
    student_id,
    language_name,
    proficiency_level
  )
  SELECT 
    p_user_id,
    (elem->>'language_name')::text,
    (elem->>'proficiency_level')::text
  FROM jsonb_array_elements(p_languages) AS elem
  WHERE (elem->>'language_name')::text IS NOT NULL 
    AND (elem->>'language_name')::text != ''
    AND (elem->>'proficiency_level')::text IS NOT NULL 
    AND (elem->>'proficiency_level')::text != '';
  
  GET DIAGNOSTICS v_languages_count = ROW_COUNT;
  
  -- Insert publication records
  INSERT INTO publication (
    student_id,
    title,
    journal_name,
    description,
    publication_year,
    publication_month,
    link
  )
  SELECT 
    p_user_id,
    (elem->>'title')::text,
    (elem->>'journal_name')::text,
    (elem->>'description')::text,
    (elem->>'publication_year')::int,
    (elem->>'publication_month')::int,
    (elem->>'link')::text
  FROM jsonb_array_elements(p_publications) AS elem
  WHERE (elem->>'title')::text IS NOT NULL 
    AND (elem->>'title')::text != '';
  
  GET DIAGNOSTICS v_publications_count = ROW_COUNT;
  
  -- Insert certification records
  INSERT INTO certification (
    student_id,
    name,
    issuing_organization,
    url
  )
  SELECT 
    p_user_id,
    (elem->>'name')::text,
    (elem->>'issuing_organization')::text,
    (elem->>'url')::text
  FROM jsonb_array_elements(p_certifications) AS elem
  WHERE (elem->>'name')::text IS NOT NULL 
    AND (elem->>'name')::text != '';
  
  GET DIAGNOSTICS v_certifications_count = ROW_COUNT;
  
  -- Insert social link record (NEW: platform-specific columns)
  -- p_social_links is now an object: {github: "url", linkedin: "url", stackoverflow: "url", kaggle: "url", leetcode: "url"}
  IF p_social_links IS NOT NULL AND jsonb_typeof(p_social_links) = 'object' THEN
    -- Check if at least one platform has a value
    IF (p_social_links->>'github') IS NOT NULL 
       OR (p_social_links->>'linkedin') IS NOT NULL
       OR (p_social_links->>'stackoverflow') IS NOT NULL
       OR (p_social_links->>'kaggle') IS NOT NULL
       OR (p_social_links->>'leetcode') IS NOT NULL
    THEN
      INSERT INTO social_link (
        student_id,
        github,
        linkedin,
        stackoverflow,
        kaggle,
        leetcode
      )
      VALUES (
        p_user_id,
        NULLIF(TRIM(p_social_links->>'github'), ''),
        NULLIF(TRIM(p_social_links->>'linkedin'), ''),
        NULLIF(TRIM(p_social_links->>'stackoverflow'), ''),
        NULLIF(TRIM(p_social_links->>'kaggle'), ''),
        NULLIF(TRIM(p_social_links->>'leetcode'), '')
      );
      
      v_social_links_count := 1;
    ELSE
      v_social_links_count := 0;
    END IF;
  ELSE
    v_social_links_count := 0;
  END IF;
  
  -- Return success with counts
  RETURN jsonb_build_object(
    'success', true,
    'education_count', v_education_count,
    'experience_count', v_experience_count,
    'projects_count', v_projects_count,
    'skills_count', v_skills_count,
    'languages_count', v_languages_count,
    'publications_count', v_publications_count,
    'certifications_count', v_certifications_count,
    'social_links_count', v_social_links_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$function$
;

-- =====================================================================
-- GRANTS
-- =====================================================================

grant delete on table "public"."academic" to "anon";
grant insert on table "public"."academic" to "anon";
grant references on table "public"."academic" to "anon";
grant select on table "public"."academic" to "anon";
grant trigger on table "public"."academic" to "anon";
grant truncate on table "public"."academic" to "anon";
grant update on table "public"."academic" to "anon";
grant delete on table "public"."academic" to "authenticated";
grant insert on table "public"."academic" to "authenticated";
grant references on table "public"."academic" to "authenticated";
grant select on table "public"."academic" to "authenticated";
grant trigger on table "public"."academic" to "authenticated";
grant truncate on table "public"."academic" to "authenticated";
grant update on table "public"."academic" to "authenticated";
grant delete on table "public"."academic" to "service_role";
grant insert on table "public"."academic" to "service_role";
grant references on table "public"."academic" to "service_role";
grant select on table "public"."academic" to "service_role";
grant trigger on table "public"."academic" to "service_role";
grant truncate on table "public"."academic" to "service_role";
grant update on table "public"."academic" to "service_role";

grant delete on table "public"."certification" to "anon";
grant insert on table "public"."certification" to "anon";
grant references on table "public"."certification" to "anon";
grant select on table "public"."certification" to "anon";
grant trigger on table "public"."certification" to "anon";
grant truncate on table "public"."certification" to "anon";
grant update on table "public"."certification" to "anon";
grant delete on table "public"."certification" to "authenticated";
grant insert on table "public"."certification" to "authenticated";
grant references on table "public"."certification" to "authenticated";
grant select on table "public"."certification" to "authenticated";
grant trigger on table "public"."certification" to "authenticated";
grant truncate on table "public"."certification" to "authenticated";
grant update on table "public"."certification" to "authenticated";
grant delete on table "public"."certification" to "service_role";
grant insert on table "public"."certification" to "service_role";
grant references on table "public"."certification" to "service_role";
grant select on table "public"."certification" to "service_role";
grant trigger on table "public"."certification" to "service_role";
grant truncate on table "public"."certification" to "service_role";
grant update on table "public"."certification" to "service_role";

grant delete on table "public"."experience" to "anon";
grant insert on table "public"."experience" to "anon";
grant references on table "public"."experience" to "anon";
grant select on table "public"."experience" to "anon";
grant trigger on table "public"."experience" to "anon";
grant truncate on table "public"."experience" to "anon";
grant update on table "public"."experience" to "anon";
grant delete on table "public"."experience" to "authenticated";
grant insert on table "public"."experience" to "authenticated";
grant references on table "public"."experience" to "authenticated";
grant select on table "public"."experience" to "authenticated";
grant trigger on table "public"."experience" to "authenticated";
grant truncate on table "public"."experience" to "authenticated";
grant update on table "public"."experience" to "authenticated";
grant delete on table "public"."experience" to "service_role";
grant insert on table "public"."experience" to "service_role";
grant references on table "public"."experience" to "service_role";
grant select on table "public"."experience" to "service_role";
grant trigger on table "public"."experience" to "service_role";
grant truncate on table "public"."experience" to "service_role";
grant update on table "public"."experience" to "service_role";

grant delete on table "public"."language" to "anon";
grant insert on table "public"."language" to "anon";
grant references on table "public"."language" to "anon";
grant select on table "public"."language" to "anon";
grant trigger on table "public"."language" to "anon";
grant truncate on table "public"."language" to "anon";
grant update on table "public"."language" to "anon";
grant delete on table "public"."language" to "authenticated";
grant insert on table "public"."language" to "authenticated";
grant references on table "public"."language" to "authenticated";
grant select on table "public"."language" to "authenticated";
grant trigger on table "public"."language" to "authenticated";
grant truncate on table "public"."language" to "authenticated";
grant update on table "public"."language" to "authenticated";
grant delete on table "public"."language" to "service_role";
grant insert on table "public"."language" to "service_role";
grant references on table "public"."language" to "service_role";
grant select on table "public"."language" to "service_role";
grant trigger on table "public"."language" to "service_role";
grant truncate on table "public"."language" to "service_role";
grant update on table "public"."language" to "service_role";

grant delete on table "public"."project" to "anon";
grant insert on table "public"."project" to "anon";
grant references on table "public"."project" to "anon";
grant select on table "public"."project" to "anon";
grant trigger on table "public"."project" to "anon";
grant truncate on table "public"."project" to "anon";
grant update on table "public"."project" to "anon";
grant delete on table "public"."project" to "authenticated";
grant insert on table "public"."project" to "authenticated";
grant references on table "public"."project" to "authenticated";
grant select on table "public"."project" to "authenticated";
grant trigger on table "public"."project" to "authenticated";
grant truncate on table "public"."project" to "authenticated";
grant update on table "public"."project" to "authenticated";
grant delete on table "public"."project" to "service_role";
grant insert on table "public"."project" to "service_role";
grant references on table "public"."project" to "service_role";
grant select on table "public"."project" to "service_role";
grant trigger on table "public"."project" to "service_role";
grant truncate on table "public"."project" to "service_role";
grant update on table "public"."project" to "service_role";

grant delete on table "public"."publication" to "anon";
grant insert on table "public"."publication" to "anon";
grant references on table "public"."publication" to "anon";
grant select on table "public"."publication" to "anon";
grant trigger on table "public"."publication" to "anon";
grant truncate on table "public"."publication" to "anon";
grant update on table "public"."publication" to "anon";
grant delete on table "public"."publication" to "authenticated";
grant insert on table "public"."publication" to "authenticated";
grant references on table "public"."publication" to "authenticated";
grant select on table "public"."publication" to "authenticated";
grant trigger on table "public"."publication" to "authenticated";
grant truncate on table "public"."publication" to "authenticated";
grant update on table "public"."publication" to "authenticated";
grant delete on table "public"."publication" to "service_role";
grant insert on table "public"."publication" to "service_role";
grant references on table "public"."publication" to "service_role";
grant select on table "public"."publication" to "service_role";
grant trigger on table "public"."publication" to "service_role";
grant truncate on table "public"."publication" to "service_role";
grant update on table "public"."publication" to "service_role";

grant delete on table "public"."resume" to "anon";
grant insert on table "public"."resume" to "anon";
grant references on table "public"."resume" to "anon";
grant select on table "public"."resume" to "anon";
grant trigger on table "public"."resume" to "anon";
grant truncate on table "public"."resume" to "anon";
grant update on table "public"."resume" to "anon";
grant delete on table "public"."resume" to "authenticated";
grant insert on table "public"."resume" to "authenticated";
grant references on table "public"."resume" to "authenticated";
grant select on table "public"."resume" to "authenticated";
grant trigger on table "public"."resume" to "authenticated";
grant truncate on table "public"."resume" to "authenticated";
grant update on table "public"."resume" to "authenticated";
grant delete on table "public"."resume" to "service_role";
grant insert on table "public"."resume" to "service_role";
grant references on table "public"."resume" to "service_role";
grant select on table "public"."resume" to "service_role";
grant trigger on table "public"."resume" to "service_role";
grant truncate on table "public"."resume" to "service_role";
grant update on table "public"."resume" to "service_role";

grant delete on table "public"."skill" to "anon";
grant insert on table "public"."skill" to "anon";
grant references on table "public"."skill" to "anon";
grant select on table "public"."skill" to "anon";
grant trigger on table "public"."skill" to "anon";
grant truncate on table "public"."skill" to "anon";
grant update on table "public"."skill" to "anon";
grant delete on table "public"."skill" to "authenticated";
grant insert on table "public"."skill" to "authenticated";
grant references on table "public"."skill" to "authenticated";
grant select on table "public"."skill" to "authenticated";
grant trigger on table "public"."skill" to "authenticated";
grant truncate on table "public"."skill" to "authenticated";
grant update on table "public"."skill" to "authenticated";
grant delete on table "public"."skill" to "service_role";
grant insert on table "public"."skill" to "service_role";
grant references on table "public"."skill" to "service_role";
grant select on table "public"."skill" to "service_role";
grant trigger on table "public"."skill" to "service_role";
grant truncate on table "public"."skill" to "service_role";
grant update on table "public"."skill" to "service_role";

grant delete on table "public"."social_link" to "anon";
grant insert on table "public"."social_link" to "anon";
grant references on table "public"."social_link" to "anon";
grant select on table "public"."social_link" to "anon";
grant trigger on table "public"."social_link" to "anon";
grant truncate on table "public"."social_link" to "anon";
grant update on table "public"."social_link" to "anon";
grant delete on table "public"."social_link" to "authenticated";
grant insert on table "public"."social_link" to "authenticated";
grant references on table "public"."social_link" to "authenticated";
grant select on table "public"."social_link" to "authenticated";
grant trigger on table "public"."social_link" to "authenticated";
grant truncate on table "public"."social_link" to "authenticated";
grant update on table "public"."social_link" to "authenticated";
grant delete on table "public"."social_link" to "service_role";
grant insert on table "public"."social_link" to "service_role";
grant references on table "public"."social_link" to "service_role";
grant select on table "public"."social_link" to "service_role";
grant trigger on table "public"."social_link" to "service_role";
grant truncate on table "public"."social_link" to "service_role";
grant update on table "public"."social_link" to "service_role";

grant delete on table "public"."student" to "anon";
grant insert on table "public"."student" to "anon";
grant references on table "public"."student" to "anon";
grant select on table "public"."student" to "anon";
grant trigger on table "public"."student" to "anon";
grant truncate on table "public"."student" to "anon";
grant update on table "public"."student" to "anon";
grant delete on table "public"."student" to "authenticated";
grant insert on table "public"."student" to "authenticated";
grant references on table "public"."student" to "authenticated";
grant select on table "public"."student" to "authenticated";
grant trigger on table "public"."student" to "authenticated";
grant truncate on table "public"."student" to "authenticated";
grant update on table "public"."student" to "authenticated";
grant delete on table "public"."student" to "service_role";
grant insert on table "public"."student" to "service_role";
grant references on table "public"."student" to "service_role";
grant select on table "public"."student" to "service_role";
grant trigger on table "public"."student" to "service_role";
grant truncate on table "public"."student" to "service_role";
grant update on table "public"."student" to "service_role";

grant delete on table "public"."student_profile_draft" to "anon";
grant insert on table "public"."student_profile_draft" to "anon";
grant references on table "public"."student_profile_draft" to "anon";
grant select on table "public"."student_profile_draft" to "anon";
grant trigger on table "public"."student_profile_draft" to "anon";
grant truncate on table "public"."student_profile_draft" to "anon";
grant update on table "public"."student_profile_draft" to "anon";
grant delete on table "public"."student_profile_draft" to "authenticated";
grant insert on table "public"."student_profile_draft" to "authenticated";
grant references on table "public"."student_profile_draft" to "authenticated";
grant select on table "public"."student_profile_draft" to "authenticated";
grant trigger on table "public"."student_profile_draft" to "authenticated";
grant truncate on table "public"."student_profile_draft" to "authenticated";
grant update on table "public"."student_profile_draft" to "authenticated";
grant delete on table "public"."student_profile_draft" to "service_role";
grant insert on table "public"."student_profile_draft" to "service_role";
grant references on table "public"."student_profile_draft" to "service_role";
grant select on table "public"."student_profile_draft" to "service_role";
grant trigger on table "public"."student_profile_draft" to "service_role";
grant truncate on table "public"."student_profile_draft" to "service_role";
grant update on table "public"."student_profile_draft" to "service_role";

-- =====================================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================================

create policy "academic_delete_own"
on "public"."academic"
as permissive
for delete
to authenticated
using ((student_id = auth.uid()));

create policy "academic_insert_own"
on "public"."academic"
as permissive
for insert
to authenticated
with check ((student_id = auth.uid()));

create policy "academic_select_own"
on "public"."academic"
as permissive
for select
to authenticated
using ((student_id = auth.uid()));

create policy "academic_update_own"
on "public"."academic"
as permissive
for update
to authenticated
using ((student_id = auth.uid()))
with check ((student_id = auth.uid()));

create policy "certification_delete_own"
on "public"."certification"
as permissive
for delete
to authenticated
using ((student_id = auth.uid()));

create policy "certification_insert_own"
on "public"."certification"
as permissive
for insert
to authenticated
with check ((student_id = auth.uid()));

create policy "certification_select_own"
on "public"."certification"
as permissive
for select
to authenticated
using ((student_id = auth.uid()));

create policy "certification_update_own"
on "public"."certification"
as permissive
for update
to authenticated
using ((student_id = auth.uid()))
with check ((student_id = auth.uid()));

create policy "experience_delete_own"
on "public"."experience"
as permissive
for delete
to authenticated
using ((student_id = auth.uid()));

create policy "experience_insert_own"
on "public"."experience"
as permissive
for insert
to authenticated
with check ((student_id = auth.uid()));

create policy "experience_select_own"
on "public"."experience"
as permissive
for select
to authenticated
using ((student_id = auth.uid()));

create policy "experience_update_own"
on "public"."experience"
as permissive
for update
to authenticated
using ((student_id = auth.uid()))
with check ((student_id = auth.uid()));

create policy "language_delete_own"
on "public"."language"
as permissive
for delete
to authenticated
using ((student_id = auth.uid()));

create policy "language_insert_own"
on "public"."language"
as permissive
for insert
to authenticated
with check ((student_id = auth.uid()));

create policy "language_select_own"
on "public"."language"
as permissive
for select
to authenticated
using ((student_id = auth.uid()));

create policy "language_update_own"
on "public"."language"
as permissive
for update
to authenticated
using ((student_id = auth.uid()))
with check ((student_id = auth.uid()));

create policy "project_delete_own"
on "public"."project"
as permissive
for delete
to authenticated
using ((student_id = auth.uid()));

create policy "project_insert_own"
on "public"."project"
as permissive
for insert
to authenticated
with check ((student_id = auth.uid()));

create policy "project_select_own"
on "public"."project"
as permissive
for select
to authenticated
using ((student_id = auth.uid()));

create policy "project_update_own"
on "public"."project"
as permissive
for update
to authenticated
using ((student_id = auth.uid()))
with check ((student_id = auth.uid()));

create policy "publication_delete_own"
on "public"."publication"
as permissive
for delete
to authenticated
using ((student_id = auth.uid()));

create policy "publication_insert_own"
on "public"."publication"
as permissive
for insert
to authenticated
with check ((student_id = auth.uid()));

create policy "publication_select_own"
on "public"."publication"
as permissive
for select
to authenticated
using ((student_id = auth.uid()));

create policy "publication_update_own"
on "public"."publication"
as permissive
for update
to authenticated
using ((student_id = auth.uid()))
with check ((student_id = auth.uid()));

create policy "resume_delete_own"
on "public"."resume"
as permissive
for delete
to authenticated
using ((student_id = auth.uid()));

create policy "resume_insert_own"
on "public"."resume"
as permissive
for insert
to authenticated
with check ((student_id = auth.uid()));

create policy "resume_select_own"
on "public"."resume"
as permissive
for select
to authenticated
using ((student_id = auth.uid()));

create policy "resume_update_own"
on "public"."resume"
as permissive
for update
to authenticated
using ((student_id = auth.uid()))
with check ((student_id = auth.uid()));

create policy "skill_delete_own"
on "public"."skill"
as permissive
for delete
to authenticated
using ((student_id = auth.uid()));

create policy "skill_insert_own"
on "public"."skill"
as permissive
for insert
to authenticated
with check ((student_id = auth.uid()));

create policy "skill_select_own"
on "public"."skill"
as permissive
for select
to authenticated
using ((student_id = auth.uid()));

create policy "skill_update_own"
on "public"."skill"
as permissive
for update
to authenticated
using ((student_id = auth.uid()))
with check ((student_id = auth.uid()));

create policy "social_link_delete_own"
on "public"."social_link"
as permissive
for delete
to authenticated
using ((student_id = auth.uid()));

create policy "social_link_insert_own"
on "public"."social_link"
as permissive
for insert
to authenticated
with check ((student_id = auth.uid()));

create policy "social_link_select_own"
on "public"."social_link"
as permissive
for select
to authenticated
using ((student_id = auth.uid()));

create policy "social_link_update_own"
on "public"."social_link"
as permissive
for update
to authenticated
using ((student_id = auth.uid()))
with check ((student_id = auth.uid()));

create policy "student_insert_own_once"
on "public"."student"
as permissive
for insert
to authenticated
with check (((auth.uid() = id) AND (NOT (EXISTS ( SELECT 1
   FROM public.student student_1
  WHERE (student_1.id = auth.uid()))))));

create policy "student_select_own"
on "public"."student"
as permissive
for select
to authenticated
using ((auth.uid() = id));

create policy "student_update_own"
on "public"."student"
as permissive
for update
to authenticated
using ((auth.uid() = id))
with check ((auth.uid() = id));

create policy "draft_delete_own"
on "public"."student_profile_draft"
as permissive
for delete
to authenticated
using ((student_id = auth.uid()));

create policy "draft_insert_own"
on "public"."student_profile_draft"
as permissive
for insert
to authenticated
with check ((student_id = auth.uid()));

create policy "draft_select_own"
on "public"."student_profile_draft"
as permissive
for select
to authenticated
using ((student_id = auth.uid()));

create policy "draft_update_own"
on "public"."student_profile_draft"
as permissive
for update
to authenticated
using ((student_id = auth.uid()))
with check ((student_id = auth.uid()));
