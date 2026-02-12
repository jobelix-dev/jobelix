-- ============================================================================
-- Migration: 04 - Applications, Work Preferences, Profile Searched
-- Description: Application tracking between students and offers, student work
--              preferences, and company profile search tracking
-- ============================================================================

-- =============================================================================
-- TABLES
-- =============================================================================

-- Application table: Links students to job offers they've applied to
create table "public"."application" (
  "id" uuid not null default gen_random_uuid(),
  "created_at" timestamp with time zone not null default now(),
  "offer_id" uuid not null default gen_random_uuid(),
  "student_id" uuid not null default gen_random_uuid(),
  "curent_state" text not null default '"unseen"'::text,
  "priority" smallint not null default '0'::smallint
);

alter table "public"."application" enable row level security;

-- Student work preferences: Job search preferences and demographics
create table "public"."student_work_preferences" (
  "id" uuid not null default gen_random_uuid(),
  "student_id" uuid not null,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "remote_work" boolean default true,
  "exp_internship" boolean default true,
  "exp_entry" boolean default true,
  "exp_associate" boolean default false,
  "exp_mid_senior" boolean default false,
  "exp_director" boolean default false,
  "exp_executive" boolean default false,
  "job_full_time" boolean default true,
  "job_contract" boolean default false,
  "job_part_time" boolean default false,
  "job_temporary" boolean default false,
  "job_internship" boolean default false,
  "job_other" boolean default false,
  "job_volunteer" boolean default false,
  "date_all_time" boolean default false,
  "date_month" boolean default true,
  "date_week" boolean default true,
  "date_24_hours" boolean default true,
  "positions" text[] default '{}'::text[],
  "locations" text[] default '{}'::text[],
  "company_blacklist" text[] default '{}'::text[],
  "title_blacklist" text[] default '{}'::text[],
  "date_of_birth" text,
  "pronouns" text,
  "gender" text,
  "is_veteran" boolean default false,
  "has_disability" boolean default false,
  "ethnicity" text,
  "eu_work_authorization" boolean default false,
  "us_work_authorization" boolean default false,
  "in_person_work" boolean default true,
  "open_to_relocation" boolean default false,
  "willing_to_complete_assessments" boolean default true,
  "willing_to_undergo_drug_tests" boolean default true,
  "willing_to_undergo_background_checks" boolean default true,
  "notice_period" text,
  "salary_expectation_usd" integer,
  "job_languages" text[] default ARRAY['en']::text[]
);

alter table "public"."student_work_preferences" enable row level security;

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_application_offer_id ON public.application USING btree (offer_id);
CREATE INDEX idx_application_student_id ON public.application USING btree (student_id);
CREATE INDEX idx_student_work_preferences_student ON public.student_work_preferences USING btree (student_id);

CREATE UNIQUE INDEX application_pkey ON public.application USING btree (id);
CREATE UNIQUE INDEX student_work_preferences_pkey ON public.student_work_preferences USING btree (id);
CREATE UNIQUE INDEX student_work_preferences_student_unique ON public.student_work_preferences USING btree (student_id);

-- =============================================================================
-- PRIMARY KEYS
-- =============================================================================

alter table "public"."application" add constraint "application_pkey" PRIMARY KEY using index "application_pkey";
alter table "public"."student_work_preferences" add constraint "student_work_preferences_pkey" PRIMARY KEY using index "student_work_preferences_pkey";

-- =============================================================================
-- FOREIGN KEYS
-- =============================================================================

alter table "public"."application" add constraint "application_offer_id_fkey" FOREIGN KEY (offer_id) REFERENCES public.company_offer(id) ON UPDATE RESTRICT ON DELETE CASCADE not valid;
alter table "public"."application" validate constraint "application_offer_id_fkey";

alter table "public"."application" add constraint "application_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.student(id) ON UPDATE RESTRICT ON DELETE CASCADE not valid;
alter table "public"."application" validate constraint "application_student_id_fkey";

alter table "public"."student_work_preferences" add constraint "student_work_preferences_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.student(id) ON DELETE CASCADE not valid;
alter table "public"."student_work_preferences" validate constraint "student_work_preferences_student_id_fkey";

alter table "public"."student_work_preferences" add constraint "student_work_preferences_student_unique" UNIQUE using index "student_work_preferences_student_unique";

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end; $function$
;

-- =============================================================================
-- GRANTS
-- =============================================================================
-- anon: SELECT only (no write access)
-- authenticated: SELECT, INSERT, UPDATE, DELETE (RLS handles authorization)
-- service_role: full access (bypasses RLS by design)

GRANT SELECT ON TABLE "public"."application" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."application" TO "authenticated";
GRANT ALL ON TABLE "public"."application" TO "service_role";

GRANT SELECT ON TABLE "public"."student_work_preferences" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."student_work_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."student_work_preferences" TO "service_role";

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Application policies
create policy "application_delete_student_unseen"
on "public"."application"
as permissive
for delete
to authenticated
using (((student_id = (SELECT auth.uid())) AND (curent_state = 'unseen'::text)));

create policy "application_insert_student_no_duplicate"
on "public"."application"
as permissive
for insert
to authenticated
with check (((student_id = (SELECT auth.uid())) AND (NOT (EXISTS ( SELECT 1
   FROM public.application application_1
  WHERE ((application_1.student_id = (SELECT auth.uid())) AND (application_1.offer_id = application.offer_id)))))));

create policy "application_select_dual"
on "public"."application"
as permissive
for select
to authenticated
using (((student_id = (SELECT auth.uid())) OR (EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = application.offer_id) AND (company_offer.company_id = (SELECT auth.uid())))))));

create policy "application_update_company_only"
on "public"."application"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = application.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))))
with check ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = application.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))));

-- Student work preferences policies
create policy "work_prefs_delete_own"
on "public"."student_work_preferences"
as permissive
for delete
to authenticated
using ((student_id = (SELECT auth.uid())));

create policy "work_prefs_insert_own"
on "public"."student_work_preferences"
as permissive
for insert
to authenticated
with check ((student_id = (SELECT auth.uid())));

create policy "work_prefs_select_own"
on "public"."student_work_preferences"
as permissive
for select
to authenticated
using ((student_id = (SELECT auth.uid())));

create policy "work_prefs_update_own"
on "public"."student_work_preferences"
as permissive
for update
to authenticated
using ((student_id = (SELECT auth.uid())))
with check ((student_id = (SELECT auth.uid())));

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================

-- Create the 'resumes' storage bucket for student resume PDF files
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

-- =============================================================================
-- STORAGE POLICIES
-- =============================================================================

-- Allow companies to view resumes of students who applied to their offers
create policy "Companies can view applicant resumes"
on "storage"."objects"
as permissive
for select
to authenticated
using (((bucket_id = 'resumes'::text) AND (EXISTS ( SELECT 1
   FROM (public.application a
     JOIN public.company_offer o ON ((a.offer_id = o.id)))
  WHERE ((o.company_id = (SELECT auth.uid())) AND ((a.student_id)::text = (storage.foldername(objects.name))[1]))))));

-- Allow students to read their own resumes
create policy "Users can read own resumes"
on "storage"."objects"
as permissive
for select
to authenticated
using (((bucket_id = 'resumes'::text) AND (((SELECT auth.uid()))::text = (storage.foldername(name))[1])));

-- Allow students to delete their own resumes
create policy "Users can delete own resumes"
on "storage"."objects"
as permissive
for delete
to authenticated
using (((bucket_id = 'resumes'::text) AND (((SELECT auth.uid()))::text = (storage.foldername(name))[1])));

-- Allow students to update their own resumes
create policy "Users can update own resumes"
on "storage"."objects"
as permissive
for update
to authenticated
using (((bucket_id = 'resumes'::text) AND ((storage.foldername(name))[1] = ((SELECT auth.uid()))::text)))
with check (((bucket_id = 'resumes'::text) AND ((storage.foldername(name))[1] = ((SELECT auth.uid()))::text)));

-- Allow students to upload their own resumes
create policy "Users can upload own resumes"
on "storage"."objects"
as permissive
for insert
to authenticated
with check (((bucket_id = 'resumes'::text) AND (((SELECT auth.uid()))::text = (storage.foldername(name))[1])));

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_student_work_preferences_updated_at 
  BEFORE UPDATE ON public.student_work_preferences 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- COLUMN COMMENTS
-- =============================================================================

COMMENT ON COLUMN student_work_preferences.job_languages IS 
  'ISO 639-1 language codes for acceptable job description languages. Defaults to English only. Examples: en (English), fr (French), de (German), es (Spanish)';
