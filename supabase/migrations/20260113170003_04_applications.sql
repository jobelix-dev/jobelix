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
  "salary_expectation_usd" integer
);

alter table "public"."student_work_preferences" enable row level security;

-- Profile searched: Company tracking of what profiles they've searched
create table "public"."profile_searched" (
  "id" uuid not null default gen_random_uuid(),
  "created_at" timestamp with time zone not null default now(),
  "academics" text,
  "experience" text,
  "difficulty" smallint
);

alter table "public"."profile_searched" enable row level security;

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_application_offer_id ON public.application USING btree (offer_id);
CREATE INDEX idx_application_student_id ON public.application USING btree (student_id);
CREATE INDEX idx_student_work_preferences_student ON public.student_work_preferences USING btree (student_id);

CREATE UNIQUE INDEX application_pkey ON public.application USING btree (id);
CREATE UNIQUE INDEX student_work_preferences_pkey ON public.student_work_preferences USING btree (id);
CREATE UNIQUE INDEX student_work_preferences_student_unique ON public.student_work_preferences USING btree (student_id);
CREATE UNIQUE INDEX profile_searched_pkey ON public.profile_searched USING btree (id);

-- =============================================================================
-- PRIMARY KEYS
-- =============================================================================

alter table "public"."application" add constraint "application_pkey" PRIMARY KEY using index "application_pkey";
alter table "public"."student_work_preferences" add constraint "student_work_preferences_pkey" PRIMARY KEY using index "student_work_preferences_pkey";
alter table "public"."profile_searched" add constraint "profile_searched_pkey" PRIMARY KEY using index "profile_searched_pkey";

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

alter table "public"."profile_searched" add constraint "profile_searched_id_fkey" FOREIGN KEY (id) REFERENCES public.company_offer(id) ON UPDATE RESTRICT ON DELETE CASCADE not valid;
alter table "public"."profile_searched" validate constraint "profile_searched_id_fkey";

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end; $function$
;

-- =============================================================================
-- GRANTS
-- =============================================================================

grant delete on table "public"."application" to "anon";
grant insert on table "public"."application" to "anon";
grant references on table "public"."application" to "anon";
grant select on table "public"."application" to "anon";
grant trigger on table "public"."application" to "anon";
grant truncate on table "public"."application" to "anon";
grant update on table "public"."application" to "anon";

grant delete on table "public"."application" to "authenticated";
grant insert on table "public"."application" to "authenticated";
grant references on table "public"."application" to "authenticated";
grant select on table "public"."application" to "authenticated";
grant trigger on table "public"."application" to "authenticated";
grant truncate on table "public"."application" to "authenticated";
grant update on table "public"."application" to "authenticated";

grant delete on table "public"."application" to "service_role";
grant insert on table "public"."application" to "service_role";
grant references on table "public"."application" to "service_role";
grant select on table "public"."application" to "service_role";
grant trigger on table "public"."application" to "service_role";
grant truncate on table "public"."application" to "service_role";
grant update on table "public"."application" to "service_role";

grant delete on table "public"."student_work_preferences" to "anon";
grant insert on table "public"."student_work_preferences" to "anon";
grant references on table "public"."student_work_preferences" to "anon";
grant select on table "public"."student_work_preferences" to "anon";
grant trigger on table "public"."student_work_preferences" to "anon";
grant truncate on table "public"."student_work_preferences" to "anon";
grant update on table "public"."student_work_preferences" to "anon";

grant delete on table "public"."student_work_preferences" to "authenticated";
grant insert on table "public"."student_work_preferences" to "authenticated";
grant references on table "public"."student_work_preferences" to "authenticated";
grant select on table "public"."student_work_preferences" to "authenticated";
grant trigger on table "public"."student_work_preferences" to "authenticated";
grant truncate on table "public"."student_work_preferences" to "authenticated";
grant update on table "public"."student_work_preferences" to "authenticated";

grant delete on table "public"."student_work_preferences" to "service_role";
grant insert on table "public"."student_work_preferences" to "service_role";
grant references on table "public"."student_work_preferences" to "service_role";
grant select on table "public"."student_work_preferences" to "service_role";
grant trigger on table "public"."student_work_preferences" to "service_role";
grant truncate on table "public"."student_work_preferences" to "service_role";
grant update on table "public"."student_work_preferences" to "service_role";

grant delete on table "public"."profile_searched" to "anon";
grant insert on table "public"."profile_searched" to "anon";
grant references on table "public"."profile_searched" to "anon";
grant select on table "public"."profile_searched" to "anon";
grant trigger on table "public"."profile_searched" to "anon";
grant truncate on table "public"."profile_searched" to "anon";
grant update on table "public"."profile_searched" to "anon";

grant delete on table "public"."profile_searched" to "authenticated";
grant insert on table "public"."profile_searched" to "authenticated";
grant references on table "public"."profile_searched" to "authenticated";
grant select on table "public"."profile_searched" to "authenticated";
grant trigger on table "public"."profile_searched" to "authenticated";
grant truncate on table "public"."profile_searched" to "authenticated";

grant delete on table "public"."profile_searched" to "service_role";
grant insert on table "public"."profile_searched" to "service_role";
grant references on table "public"."profile_searched" to "service_role";
grant select on table "public"."profile_searched" to "service_role";
grant trigger on table "public"."profile_searched" to "service_role";
grant truncate on table "public"."profile_searched" to "service_role";
grant update on table "public"."profile_searched" to "service_role";

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Application policies
create policy "application_delete_student_unseen"
on "public"."application"
as permissive
for delete
to authenticated
using (((student_id = auth.uid()) AND (curent_state = 'unseen'::text)));

create policy "application_insert_student_no_duplicate"
on "public"."application"
as permissive
for insert
to authenticated
with check (((student_id = auth.uid()) AND (NOT (EXISTS ( SELECT 1
   FROM public.application application_1
  WHERE ((application_1.student_id = auth.uid()) AND (application_1.offer_id = application_1.offer_id)))))));

create policy "application_select_dual"
on "public"."application"
as permissive
for select
to authenticated
using (((student_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = application.offer_id) AND (company_offer.company_id = auth.uid()))))));

create policy "application_update_company_only"
on "public"."application"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = application.offer_id) AND (company_offer.company_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = application.offer_id) AND (company_offer.company_id = auth.uid())))));

-- Student work preferences policies
create policy "work_prefs_delete_own"
on "public"."student_work_preferences"
as permissive
for delete
to authenticated
using ((student_id = auth.uid()));

create policy "work_prefs_insert_own_once"
on "public"."student_work_preferences"
as permissive
for insert
to authenticated
with check (((student_id = auth.uid()) AND (NOT (EXISTS ( SELECT 1
   FROM public.student_work_preferences student_work_preferences_1
  WHERE (student_work_preferences_1.student_id = auth.uid()))))));

create policy "work_prefs_select_own"
on "public"."student_work_preferences"
as permissive
for select
to authenticated
using ((student_id = auth.uid()));

create policy "work_prefs_update_own"
on "public"."student_work_preferences"
as permissive
for update
to authenticated
using ((student_id = auth.uid()))
with check ((student_id = auth.uid()));

-- Profile searched policies
create policy "profile_searched_delete_owner"
on "public"."profile_searched"
as permissive
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = profile_searched.id) AND (company_offer.company_id = auth.uid())))));

create policy "profile_searched_insert_owner"
on "public"."profile_searched"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = profile_searched.id) AND (company_offer.company_id = auth.uid())))));

create policy "profile_searched_select_owner"
on "public"."profile_searched"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = profile_searched.id) AND (company_offer.company_id = auth.uid())))));

create policy "profile_searched_update_owner"
on "public"."profile_searched"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = profile_searched.id) AND (company_offer.company_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = profile_searched.id) AND (company_offer.company_id = auth.uid())))));

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_student_work_preferences_updated_at 
  BEFORE UPDATE ON public.student_work_preferences 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
