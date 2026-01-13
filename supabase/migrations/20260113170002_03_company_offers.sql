-- =====================================================================
-- Migration: Company Offers and Related Tables
-- Description: Creates all company offer-related tables including 
--              company, company_offer, company_offer_draft, and all 
--              normalized offer detail tables (offer_skills, 
--              offer_locations, offer_responsibilities, offer_capabilities,
--              offer_questions, offer_perks).
--              Includes the publish_offer_draft() function that transforms
--              draft JSONB data into normalized offer tables.
-- =====================================================================

-- =====================================================================
-- COMPANY TABLES
-- =====================================================================

create table "public"."company" (
  "id" uuid not null default gen_random_uuid(),
  "created_at" timestamp with time zone not null default now(),
  "company_name" text,
  "description" text,
  "mail_adress" text not null
);

alter table "public"."company" enable row level security;

create table "public"."company_offer" (
  "id" uuid not null default gen_random_uuid(),
  "company_id" uuid not null default gen_random_uuid(),
  "created_at" timestamp with time zone not null default now(),
  "position_name" text not null,
  "description" text,
  "status" text default 'draft'::text,
  "published_at" timestamp with time zone,
  "salary_min" integer,
  "salary_max" integer,
  "salary_currency" text default 'EUR'::text,
  "salary_period" text,
  "equity" boolean default false,
  "equity_range" text,
  "remote_mode" text,
  "employment_type" text,
  "availability" text,
  "seniority" text
);

alter table "public"."company_offer" enable row level security;

create table "public"."company_offer_draft" (
  "id" uuid not null default gen_random_uuid(),
  "company_id" uuid not null,
  "offer_id" uuid,
  "basic_info" jsonb default '{"description": null, "position_name": ""}'::jsonb,
  "compensation" jsonb default '{"equity": false, "salary_max": null, "salary_min": null, "equity_range": null, "salary_period": null, "salary_currency": "EUR"}'::jsonb,
  "work_config" jsonb default '{"start_date": null, "remote_mode": null, "availability": null, "employment_type": null}'::jsonb,
  "skills" jsonb default '[]'::jsonb,
  "locations" jsonb default '[]'::jsonb,
  "responsibilities" jsonb default '[]'::jsonb,
  "capabilities" jsonb default '[]'::jsonb,
  "questions" jsonb default '[]'::jsonb,
  "perks" jsonb default '[]'::jsonb,
  "status" text default 'editing'::text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "seniority" text
);

alter table "public"."company_offer_draft" enable row level security;

-- =====================================================================
-- NORMALIZED OFFER DETAIL TABLES
-- =====================================================================

create table "public"."offer_skills" (
  "id" uuid not null default gen_random_uuid(),
  "offer_id" uuid not null,
  "skill_slug" text not null,
  "skill_text" text not null,
  "importance" text not null,
  "level" text,
  "years" integer,
  "created_at" timestamp with time zone default now()
);

alter table "public"."offer_skills" enable row level security;

create table "public"."offer_locations" (
  "id" uuid not null default gen_random_uuid(),
  "offer_id" uuid not null,
  "city" text,
  "country" text,
  "created_at" timestamp with time zone default now()
);

alter table "public"."offer_locations" enable row level security;

create table "public"."offer_responsibilities" (
  "id" uuid not null default gen_random_uuid(),
  "offer_id" uuid not null,
  "text" text not null,
  "created_at" timestamp with time zone default now()
);

alter table "public"."offer_responsibilities" enable row level security;

create table "public"."offer_capabilities" (
  "id" uuid not null default gen_random_uuid(),
  "offer_id" uuid not null,
  "text" text not null,
  "importance" text not null,
  "created_at" timestamp with time zone default now()
);

alter table "public"."offer_capabilities" enable row level security;

create table "public"."offer_questions" (
  "id" uuid not null default gen_random_uuid(),
  "offer_id" uuid not null,
  "question" text not null,
  "created_at" timestamp with time zone default now()
);

alter table "public"."offer_questions" enable row level security;

create table "public"."offer_perks" (
  "id" uuid not null default gen_random_uuid(),
  "offer_id" uuid not null,
  "text" text not null,
  "created_at" timestamp with time zone default now()
);

alter table "public"."offer_perks" enable row level security;

-- =====================================================================
-- INDEXES
-- =====================================================================

CREATE INDEX company_offer_draft_company_id_idx ON public.company_offer_draft USING btree (company_id);
CREATE INDEX company_offer_draft_offer_id_idx ON public.company_offer_draft USING btree (offer_id);
CREATE UNIQUE INDEX company_offer_draft_pkey ON public.company_offer_draft USING btree (id);
CREATE UNIQUE INDEX company_offer_one_active_draft_per_offer ON public.company_offer_draft USING btree (offer_id) WHERE ((offer_id IS NOT NULL) AND (status = ANY (ARRAY['editing'::text, 'ready_to_publish'::text])));
CREATE UNIQUE INDEX company_offer_pkey ON public.company_offer USING btree (id);
CREATE UNIQUE INDEX company_pkey ON public.company USING btree (id);
CREATE INDEX idx_company_offer_company_id ON public.company_offer USING btree (company_id);
CREATE INDEX idx_offer_capabilities_importance ON public.offer_capabilities USING btree (importance);
CREATE INDEX idx_offer_capabilities_offer_id ON public.offer_capabilities USING btree (offer_id);
CREATE INDEX idx_offer_locations_city ON public.offer_locations USING btree (city);
CREATE INDEX idx_offer_locations_country ON public.offer_locations USING btree (country);
CREATE INDEX idx_offer_locations_offer_id ON public.offer_locations USING btree (offer_id);
CREATE INDEX idx_offer_perks_offer_id ON public.offer_perks USING btree (offer_id);
CREATE INDEX idx_offer_questions_offer_id ON public.offer_questions USING btree (offer_id);
CREATE INDEX idx_offer_responsibilities_offer_id ON public.offer_responsibilities USING btree (offer_id);
CREATE INDEX idx_offer_skills_importance ON public.offer_skills USING btree (importance);
CREATE INDEX idx_offer_skills_offer_id ON public.offer_skills USING btree (offer_id);
CREATE INDEX idx_offer_skills_skill_slug ON public.offer_skills USING btree (skill_slug);
CREATE UNIQUE INDEX offer_capabilities_pkey ON public.offer_capabilities USING btree (id);
CREATE UNIQUE INDEX offer_locations_pkey ON public.offer_locations USING btree (id);
CREATE UNIQUE INDEX offer_perks_pkey ON public.offer_perks USING btree (id);
CREATE UNIQUE INDEX offer_questions_pkey ON public.offer_questions USING btree (id);
CREATE UNIQUE INDEX offer_responsibilities_pkey ON public.offer_responsibilities USING btree (id);
CREATE UNIQUE INDEX offer_skills_pkey ON public.offer_skills USING btree (id);
CREATE UNIQUE INDEX unique_offer_skill ON public.offer_skills USING btree (offer_id, skill_slug);

-- =====================================================================
-- PRIMARY KEY CONSTRAINTS
-- =====================================================================

alter table "public"."company" add constraint "company_pkey" PRIMARY KEY using index "company_pkey";
alter table "public"."company_offer" add constraint "company_offer_pkey" PRIMARY KEY using index "company_offer_pkey";
alter table "public"."company_offer_draft" add constraint "company_offer_draft_pkey" PRIMARY KEY using index "company_offer_draft_pkey";
alter table "public"."offer_capabilities" add constraint "offer_capabilities_pkey" PRIMARY KEY using index "offer_capabilities_pkey";
alter table "public"."offer_locations" add constraint "offer_locations_pkey" PRIMARY KEY using index "offer_locations_pkey";
alter table "public"."offer_perks" add constraint "offer_perks_pkey" PRIMARY KEY using index "offer_perks_pkey";
alter table "public"."offer_questions" add constraint "offer_questions_pkey" PRIMARY KEY using index "offer_questions_pkey";
alter table "public"."offer_responsibilities" add constraint "offer_responsibilities_pkey" PRIMARY KEY using index "offer_responsibilities_pkey";
alter table "public"."offer_skills" add constraint "offer_skills_pkey" PRIMARY KEY using index "offer_skills_pkey";

-- =====================================================================
-- CHECK CONSTRAINTS
-- =====================================================================

alter table "public"."company_offer" add constraint "company_offer_employment_type_check" CHECK ((employment_type = ANY (ARRAY['full_time'::text, 'part_time'::text, 'contract'::text, 'intern'::text]))) not valid;
alter table "public"."company_offer" validate constraint "company_offer_employment_type_check";
alter table "public"."company_offer" add constraint "company_offer_remote_mode_check" CHECK ((remote_mode = ANY (ARRAY['onsite'::text, 'hybrid'::text, 'remote'::text]))) not valid;
alter table "public"."company_offer" validate constraint "company_offer_remote_mode_check";
alter table "public"."company_offer" add constraint "company_offer_salary_currency_check" CHECK ((length(salary_currency) = 3)) not valid;
alter table "public"."company_offer" validate constraint "company_offer_salary_currency_check";
alter table "public"."company_offer" add constraint "company_offer_salary_period_check" CHECK ((salary_period = ANY (ARRAY['hour'::text, 'day'::text, 'month'::text, 'year'::text]))) not valid;
alter table "public"."company_offer" validate constraint "company_offer_salary_period_check";
alter table "public"."company_offer" add constraint "company_offer_seniority_check" CHECK ((seniority = ANY (ARRAY['junior'::text, 'mid'::text, 'senior'::text, 'lead'::text, 'principal'::text, 'staff'::text]))) not valid;
alter table "public"."company_offer" validate constraint "company_offer_seniority_check";
alter table "public"."company_offer" add constraint "company_offer_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'closed'::text]))) not valid;
alter table "public"."company_offer" validate constraint "company_offer_status_check";

alter table "public"."company_offer_draft" add constraint "company_offer_draft_seniority_check" CHECK ((seniority = ANY (ARRAY['junior'::text, 'mid'::text, 'senior'::text, 'lead'::text, 'principal'::text, 'staff'::text]))) not valid;
alter table "public"."company_offer_draft" validate constraint "company_offer_draft_seniority_check";
alter table "public"."company_offer_draft" add constraint "company_offer_draft_status_check" CHECK ((status = ANY (ARRAY['editing'::text, 'ready_to_publish'::text]))) not valid;
alter table "public"."company_offer_draft" validate constraint "company_offer_draft_status_check";

alter table "public"."offer_capabilities" add constraint "offer_capabilities_importance_check" CHECK ((importance = ANY (ARRAY['must'::text, 'nice'::text]))) not valid;
alter table "public"."offer_capabilities" validate constraint "offer_capabilities_importance_check";

alter table "public"."offer_skills" add constraint "offer_skills_importance_check" CHECK ((importance = ANY (ARRAY['must'::text, 'nice'::text]))) not valid;
alter table "public"."offer_skills" validate constraint "offer_skills_importance_check";

-- =====================================================================
-- FOREIGN KEY CONSTRAINTS
-- =====================================================================

alter table "public"."company" add constraint "company_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON UPDATE RESTRICT ON DELETE CASCADE not valid;
alter table "public"."company" validate constraint "company_id_fkey";

alter table "public"."company_offer" add constraint "company_offer_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.company(id) ON UPDATE RESTRICT ON DELETE CASCADE not valid;
alter table "public"."company_offer" validate constraint "company_offer_company_id_fkey";

alter table "public"."company_offer_draft" add constraint "company_offer_draft_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.company(id) ON DELETE CASCADE not valid;
alter table "public"."company_offer_draft" validate constraint "company_offer_draft_company_id_fkey";
alter table "public"."company_offer_draft" add constraint "company_offer_draft_offer_id_fkey" FOREIGN KEY (offer_id) REFERENCES public.company_offer(id) ON DELETE SET NULL not valid;
alter table "public"."company_offer_draft" validate constraint "company_offer_draft_offer_id_fkey";

alter table "public"."offer_capabilities" add constraint "offer_capabilities_offer_id_fkey" FOREIGN KEY (offer_id) REFERENCES public.company_offer(id) ON DELETE CASCADE not valid;
alter table "public"."offer_capabilities" validate constraint "offer_capabilities_offer_id_fkey";

alter table "public"."offer_locations" add constraint "offer_locations_offer_id_fkey" FOREIGN KEY (offer_id) REFERENCES public.company_offer(id) ON DELETE CASCADE not valid;
alter table "public"."offer_locations" validate constraint "offer_locations_offer_id_fkey";

alter table "public"."offer_perks" add constraint "offer_perks_offer_id_fkey" FOREIGN KEY (offer_id) REFERENCES public.company_offer(id) ON DELETE CASCADE not valid;
alter table "public"."offer_perks" validate constraint "offer_perks_offer_id_fkey";

alter table "public"."offer_questions" add constraint "offer_questions_offer_id_fkey" FOREIGN KEY (offer_id) REFERENCES public.company_offer(id) ON DELETE CASCADE not valid;
alter table "public"."offer_questions" validate constraint "offer_questions_offer_id_fkey";

alter table "public"."offer_responsibilities" add constraint "offer_responsibilities_offer_id_fkey" FOREIGN KEY (offer_id) REFERENCES public.company_offer(id) ON DELETE CASCADE not valid;
alter table "public"."offer_responsibilities" validate constraint "offer_responsibilities_offer_id_fkey";

alter table "public"."offer_skills" add constraint "offer_skills_offer_id_fkey" FOREIGN KEY (offer_id) REFERENCES public.company_offer(id) ON DELETE CASCADE not valid;
alter table "public"."offer_skills" validate constraint "offer_skills_offer_id_fkey";
alter table "public"."offer_skills" add constraint "unique_offer_skill" UNIQUE using index "unique_offer_skill";

-- =====================================================================
-- FUNCTION: publish_offer_draft()
-- Description: Transforms offer draft JSONB data into normalized tables.
--              Handles both new offer creation and updates to existing offers.
--              Processes all offer details including skills, locations,
--              responsibilities, capabilities, questions, and perks.
-- =====================================================================

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.publish_offer_draft(p_draft_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_draft company_offer_draft%ROWTYPE;
  v_offer_id UUID;
  v_company_id UUID;
  v_skill JSONB;
  v_location JSONB;
  v_responsibility JSONB;
  v_capability JSONB;
  v_question JSONB;
  v_perk JSONB;
BEGIN
  -- Get the draft data and verify ownership
  SELECT * INTO v_draft
  FROM company_offer_draft
  WHERE id = p_draft_id AND company_id = (SELECT auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draft not found or access denied';
  END IF;

  -- Validate required fields
  IF v_draft.basic_info->>'position_name' IS NULL OR v_draft.basic_info->>'position_name' = '' THEN
    RAISE EXCEPTION 'Position name is required';
  END IF;

  v_company_id := v_draft.company_id;

  -- Determine if this is an update or new offer
  IF v_draft.offer_id IS NOT NULL THEN
    -- Updating existing offer
    v_offer_id := v_draft.offer_id;
    
    -- Update main offer record
    UPDATE company_offer SET
      position_name = v_draft.basic_info->>'position_name',
      description = v_draft.basic_info->>'description',
      salary_min = NULLIF(v_draft.compensation->>'salary_min', '')::integer,
      salary_max = NULLIF(v_draft.compensation->>'salary_max', '')::integer,
      salary_currency = COALESCE(v_draft.compensation->>'salary_currency', 'EUR'),
      salary_period = v_draft.compensation->>'salary_period',
      equity = COALESCE((v_draft.compensation->>'equity')::boolean, false),
      equity_range = NULLIF(v_draft.compensation->>'equity_range', ''),
      remote_mode = v_draft.work_config->>'remote_mode',
      employment_type = v_draft.work_config->>'employment_type',
      availability = v_draft.work_config->>'availability',
      seniority = v_draft.seniority,
      status = 'published',
      published_at = now()
    WHERE id = v_offer_id AND company_id = v_company_id;

  ELSE
    -- Creating new offer
    INSERT INTO company_offer (
      company_id,
      position_name,
      description,
      salary_min,
      salary_max,
      salary_currency,
      salary_period,
      equity,
      equity_range,
      remote_mode,
      employment_type,
      availability,
      seniority,
      status,
      published_at
    ) VALUES (
      v_company_id,
      v_draft.basic_info->>'position_name',
      v_draft.basic_info->>'description',
      NULLIF(v_draft.compensation->>'salary_min', '')::integer,
      NULLIF(v_draft.compensation->>'salary_max', '')::integer,
      COALESCE(v_draft.compensation->>'salary_currency', 'EUR'),
      v_draft.compensation->>'salary_period',
      COALESCE((v_draft.compensation->>'equity')::boolean, false),
      NULLIF(v_draft.compensation->>'equity_range', ''),
      v_draft.work_config->>'remote_mode',
      v_draft.work_config->>'employment_type',
      v_draft.work_config->>'availability',
      v_draft.seniority,
      'published',
      now()
    )
    RETURNING id INTO v_offer_id;
  END IF;

  -- Delete existing child records (for both new and update scenarios)
  DELETE FROM offer_skills WHERE offer_id = v_offer_id;
  DELETE FROM offer_locations WHERE offer_id = v_offer_id;
  DELETE FROM offer_responsibilities WHERE offer_id = v_offer_id;
  DELETE FROM offer_capabilities WHERE offer_id = v_offer_id;
  DELETE FROM offer_questions WHERE offer_id = v_offer_id;
  DELETE FROM offer_perks WHERE offer_id = v_offer_id;

  -- Insert skills
  FOR v_skill IN SELECT * FROM jsonb_array_elements(v_draft.skills)
  LOOP
    -- Only insert non-empty skills
    IF v_skill->>'skill_text' IS NOT NULL AND v_skill->>'skill_text' != '' THEN
      INSERT INTO offer_skills (
        offer_id,
        skill_slug,
        skill_text,
        importance,
        level,
        years
      ) VALUES (
        v_offer_id,
        COALESCE(v_skill->>'skill_slug', ''),
        v_skill->>'skill_text',
        COALESCE(v_skill->>'importance', 'must'),
        NULLIF(v_skill->>'level', ''),
        NULLIF(v_skill->>'years', '')::integer
      );
    END IF;
  END LOOP;

  -- Insert locations
  FOR v_location IN SELECT * FROM jsonb_array_elements(v_draft.locations)
  LOOP
    -- Only insert locations with at least city or country
    IF v_location->>'city' IS NOT NULL OR v_location->>'country' IS NOT NULL THEN
      INSERT INTO offer_locations (
        offer_id,
        city,
        country
      ) VALUES (
        v_offer_id,
        NULLIF(v_location->>'city', ''),
        NULLIF(v_location->>'country', '')
      );
    END IF;
  END LOOP;

  -- Insert responsibilities
  FOR v_responsibility IN SELECT * FROM jsonb_array_elements(v_draft.responsibilities)
  LOOP
    -- Only insert non-empty responsibilities
    IF v_responsibility->>'text' IS NOT NULL AND v_responsibility->>'text' != '' THEN
      INSERT INTO offer_responsibilities (
        offer_id,
        text
      ) VALUES (
        v_offer_id,
        v_responsibility->>'text'
      );
    END IF;
  END LOOP;

  -- Insert capabilities
  FOR v_capability IN SELECT * FROM jsonb_array_elements(v_draft.capabilities)
  LOOP
    -- Only insert non-empty capabilities
    IF v_capability->>'text' IS NOT NULL AND v_capability->>'text' != '' THEN
      INSERT INTO offer_capabilities (
        offer_id,
        text,
        importance
      ) VALUES (
        v_offer_id,
        v_capability->>'text',
        COALESCE(v_capability->>'importance', 'must')
      );
    END IF;
  END LOOP;

  -- Insert questions
  FOR v_question IN SELECT * FROM jsonb_array_elements(v_draft.questions)
  LOOP
    -- Only insert non-empty questions
    IF v_question->>'question' IS NOT NULL AND v_question->>'question' != '' THEN
      INSERT INTO offer_questions (
        offer_id,
        question
      ) VALUES (
        v_offer_id,
        v_question->>'question'
      );
    END IF;
  END LOOP;

  -- Insert perks
  FOR v_perk IN SELECT * FROM jsonb_array_elements(v_draft.perks)
  LOOP
    -- Only insert non-empty perks
    IF v_perk->>'text' IS NOT NULL AND v_perk->>'text' != '' THEN
      INSERT INTO offer_perks (
        offer_id,
        text
      ) VALUES (
        v_offer_id,
        v_perk->>'text'
      );
    END IF;
  END LOOP;

  -- Link draft to published offer (for future edits)
  UPDATE company_offer_draft
  SET offer_id = v_offer_id,
      status = 'ready_to_publish'
  WHERE id = p_draft_id;

  -- Return the published offer ID
  RETURN v_offer_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically in PostgreSQL functions
    RAISE EXCEPTION 'Failed to publish offer: %', SQLERRM;
END;
$function$
;

-- =====================================================================
-- GRANTS
-- =====================================================================

grant delete on table "public"."company" to "anon";
grant insert on table "public"."company" to "anon";
grant references on table "public"."company" to "anon";
grant select on table "public"."company" to "anon";
grant trigger on table "public"."company" to "anon";
grant truncate on table "public"."company" to "anon";
grant update on table "public"."company" to "anon";
grant delete on table "public"."company" to "authenticated";
grant insert on table "public"."company" to "authenticated";
grant references on table "public"."company" to "authenticated";
grant select on table "public"."company" to "authenticated";
grant trigger on table "public"."company" to "authenticated";
grant truncate on table "public"."company" to "authenticated";
grant delete on table "public"."company" to "service_role";
grant insert on table "public"."company" to "service_role";
grant references on table "public"."company" to "service_role";
grant select on table "public"."company" to "service_role";
grant trigger on table "public"."company" to "service_role";
grant truncate on table "public"."company" to "service_role";
grant update on table "public"."company" to "service_role";

grant delete on table "public"."company_offer" to "anon";
grant insert on table "public"."company_offer" to "anon";
grant references on table "public"."company_offer" to "anon";
grant select on table "public"."company_offer" to "anon";
grant trigger on table "public"."company_offer" to "anon";
grant truncate on table "public"."company_offer" to "anon";
grant update on table "public"."company_offer" to "anon";
grant delete on table "public"."company_offer" to "authenticated";
grant insert on table "public"."company_offer" to "authenticated";
grant references on table "public"."company_offer" to "authenticated";
grant select on table "public"."company_offer" to "authenticated";
grant trigger on table "public"."company_offer" to "authenticated";
grant truncate on table "public"."company_offer" to "authenticated";
grant update on table "public"."company_offer" to "authenticated";
grant delete on table "public"."company_offer" to "service_role";
grant insert on table "public"."company_offer" to "service_role";
grant references on table "public"."company_offer" to "service_role";
grant select on table "public"."company_offer" to "service_role";
grant trigger on table "public"."company_offer" to "service_role";
grant truncate on table "public"."company_offer" to "service_role";
grant update on table "public"."company_offer" to "service_role";

grant delete on table "public"."company_offer_draft" to "anon";
grant insert on table "public"."company_offer_draft" to "anon";
grant references on table "public"."company_offer_draft" to "anon";
grant select on table "public"."company_offer_draft" to "anon";
grant trigger on table "public"."company_offer_draft" to "anon";
grant truncate on table "public"."company_offer_draft" to "anon";
grant update on table "public"."company_offer_draft" to "anon";
grant delete on table "public"."company_offer_draft" to "authenticated";
grant insert on table "public"."company_offer_draft" to "authenticated";
grant references on table "public"."company_offer_draft" to "authenticated";
grant select on table "public"."company_offer_draft" to "authenticated";
grant trigger on table "public"."company_offer_draft" to "authenticated";
grant truncate on table "public"."company_offer_draft" to "authenticated";
grant update on table "public"."company_offer_draft" to "authenticated";
grant delete on table "public"."company_offer_draft" to "service_role";
grant insert on table "public"."company_offer_draft" to "service_role";
grant references on table "public"."company_offer_draft" to "service_role";
grant select on table "public"."company_offer_draft" to "service_role";
grant trigger on table "public"."company_offer_draft" to "service_role";
grant truncate on table "public"."company_offer_draft" to "service_role";
grant update on table "public"."company_offer_draft" to "service_role";

grant delete on table "public"."offer_capabilities" to "anon";
grant insert on table "public"."offer_capabilities" to "anon";
grant references on table "public"."offer_capabilities" to "anon";
grant select on table "public"."offer_capabilities" to "anon";
grant trigger on table "public"."offer_capabilities" to "anon";
grant truncate on table "public"."offer_capabilities" to "anon";
grant update on table "public"."offer_capabilities" to "anon";
grant delete on table "public"."offer_capabilities" to "authenticated";
grant insert on table "public"."offer_capabilities" to "authenticated";
grant references on table "public"."offer_capabilities" to "authenticated";
grant select on table "public"."offer_capabilities" to "authenticated";
grant trigger on table "public"."offer_capabilities" to "authenticated";
grant truncate on table "public"."offer_capabilities" to "authenticated";
grant update on table "public"."offer_capabilities" to "authenticated";
grant delete on table "public"."offer_capabilities" to "service_role";
grant insert on table "public"."offer_capabilities" to "service_role";
grant references on table "public"."offer_capabilities" to "service_role";
grant select on table "public"."offer_capabilities" to "service_role";
grant trigger on table "public"."offer_capabilities" to "service_role";
grant truncate on table "public"."offer_capabilities" to "service_role";
grant update on table "public"."offer_capabilities" to "service_role";

grant delete on table "public"."offer_locations" to "anon";
grant insert on table "public"."offer_locations" to "anon";
grant references on table "public"."offer_locations" to "anon";
grant select on table "public"."offer_locations" to "anon";
grant trigger on table "public"."offer_locations" to "anon";
grant truncate on table "public"."offer_locations" to "anon";
grant update on table "public"."offer_locations" to "anon";
grant delete on table "public"."offer_locations" to "authenticated";
grant insert on table "public"."offer_locations" to "authenticated";
grant references on table "public"."offer_locations" to "authenticated";
grant select on table "public"."offer_locations" to "authenticated";
grant trigger on table "public"."offer_locations" to "authenticated";
grant truncate on table "public"."offer_locations" to "authenticated";
grant update on table "public"."offer_locations" to "authenticated";
grant delete on table "public"."offer_locations" to "service_role";
grant insert on table "public"."offer_locations" to "service_role";
grant references on table "public"."offer_locations" to "service_role";
grant select on table "public"."offer_locations" to "service_role";
grant trigger on table "public"."offer_locations" to "service_role";
grant truncate on table "public"."offer_locations" to "service_role";
grant update on table "public"."offer_locations" to "service_role";

grant delete on table "public"."offer_perks" to "anon";
grant insert on table "public"."offer_perks" to "anon";
grant references on table "public"."offer_perks" to "anon";
grant select on table "public"."offer_perks" to "anon";
grant trigger on table "public"."offer_perks" to "anon";
grant truncate on table "public"."offer_perks" to "anon";
grant update on table "public"."offer_perks" to "anon";
grant delete on table "public"."offer_perks" to "authenticated";
grant insert on table "public"."offer_perks" to "authenticated";
grant references on table "public"."offer_perks" to "authenticated";
grant select on table "public"."offer_perks" to "authenticated";
grant trigger on table "public"."offer_perks" to "authenticated";
grant truncate on table "public"."offer_perks" to "authenticated";
grant update on table "public"."offer_perks" to "authenticated";
grant delete on table "public"."offer_perks" to "service_role";
grant insert on table "public"."offer_perks" to "service_role";
grant references on table "public"."offer_perks" to "service_role";
grant select on table "public"."offer_perks" to "service_role";
grant trigger on table "public"."offer_perks" to "service_role";
grant truncate on table "public"."offer_perks" to "service_role";
grant update on table "public"."offer_perks" to "service_role";

grant delete on table "public"."offer_questions" to "anon";
grant insert on table "public"."offer_questions" to "anon";
grant references on table "public"."offer_questions" to "anon";
grant select on table "public"."offer_questions" to "anon";
grant trigger on table "public"."offer_questions" to "anon";
grant truncate on table "public"."offer_questions" to "anon";
grant update on table "public"."offer_questions" to "anon";
grant delete on table "public"."offer_questions" to "authenticated";
grant insert on table "public"."offer_questions" to "authenticated";
grant references on table "public"."offer_questions" to "authenticated";
grant select on table "public"."offer_questions" to "authenticated";
grant trigger on table "public"."offer_questions" to "authenticated";
grant truncate on table "public"."offer_questions" to "authenticated";
grant update on table "public"."offer_questions" to "authenticated";
grant delete on table "public"."offer_questions" to "service_role";
grant insert on table "public"."offer_questions" to "service_role";
grant references on table "public"."offer_questions" to "service_role";
grant select on table "public"."offer_questions" to "service_role";
grant trigger on table "public"."offer_questions" to "service_role";
grant truncate on table "public"."offer_questions" to "service_role";
grant update on table "public"."offer_questions" to "service_role";

grant delete on table "public"."offer_responsibilities" to "anon";
grant insert on table "public"."offer_responsibilities" to "anon";
grant references on table "public"."offer_responsibilities" to "anon";
grant select on table "public"."offer_responsibilities" to "anon";
grant trigger on table "public"."offer_responsibilities" to "anon";
grant truncate on table "public"."offer_responsibilities" to "anon";
grant update on table "public"."offer_responsibilities" to "anon";
grant delete on table "public"."offer_responsibilities" to "authenticated";
grant insert on table "public"."offer_responsibilities" to "authenticated";
grant references on table "public"."offer_responsibilities" to "authenticated";
grant select on table "public"."offer_responsibilities" to "authenticated";
grant trigger on table "public"."offer_responsibilities" to "authenticated";
grant truncate on table "public"."offer_responsibilities" to "authenticated";
grant update on table "public"."offer_responsibilities" to "authenticated";
grant delete on table "public"."offer_responsibilities" to "service_role";
grant insert on table "public"."offer_responsibilities" to "service_role";
grant references on table "public"."offer_responsibilities" to "service_role";
grant select on table "public"."offer_responsibilities" to "service_role";
grant trigger on table "public"."offer_responsibilities" to "service_role";
grant truncate on table "public"."offer_responsibilities" to "service_role";
grant update on table "public"."offer_responsibilities" to "service_role";

grant delete on table "public"."offer_skills" to "anon";
grant insert on table "public"."offer_skills" to "anon";
grant references on table "public"."offer_skills" to "anon";
grant select on table "public"."offer_skills" to "anon";
grant trigger on table "public"."offer_skills" to "anon";
grant truncate on table "public"."offer_skills" to "anon";
grant update on table "public"."offer_skills" to "anon";
grant delete on table "public"."offer_skills" to "authenticated";
grant insert on table "public"."offer_skills" to "authenticated";
grant references on table "public"."offer_skills" to "authenticated";
grant select on table "public"."offer_skills" to "authenticated";
grant trigger on table "public"."offer_skills" to "authenticated";
grant truncate on table "public"."offer_skills" to "authenticated";
grant update on table "public"."offer_skills" to "authenticated";
grant delete on table "public"."offer_skills" to "service_role";
grant insert on table "public"."offer_skills" to "service_role";
grant references on table "public"."offer_skills" to "service_role";
grant select on table "public"."offer_skills" to "service_role";
grant trigger on table "public"."offer_skills" to "service_role";
grant truncate on table "public"."offer_skills" to "service_role";
grant update on table "public"."offer_skills" to "service_role";

-- =====================================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================================

create policy "company_insert_own_once"
on "public"."company"
as permissive
for insert
to authenticated
with check (((auth.uid() = id) AND (NOT (EXISTS ( SELECT 1
   FROM public.company company_1
  WHERE (company_1.id = (SELECT auth.uid())))))));

create policy "company_select_own_or_has_offers"
on "public"."company"
as permissive
for select
to authenticated
using ((((SELECT auth.uid()) = id) OR (EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE (company_offer.company_id = company.id)))));

create policy "company_update_own"
on "public"."company"
as permissive
for update
to authenticated
using (((SELECT auth.uid()) = id))
with check (((SELECT auth.uid()) = id));

create policy "offer_delete_own"
on "public"."company_offer"
as permissive
for delete
to authenticated
using ((company_id = (SELECT auth.uid())));

create policy "offer_insert_own"
on "public"."company_offer"
as permissive
for insert
to authenticated
with check ((company_id = (SELECT auth.uid())));

create policy "offer_select_public"
on "public"."company_offer"
as permissive
for select
to authenticated
using (true);

create policy "offer_update_own"
on "public"."company_offer"
as permissive
for update
to authenticated
using ((company_id = (SELECT auth.uid())))
with check ((company_id = (SELECT auth.uid())));

create policy "offer_draft_delete_own"
on "public"."company_offer_draft"
as permissive
for delete
to authenticated
using ((company_id = (SELECT auth.uid())));

create policy "offer_draft_insert_own"
on "public"."company_offer_draft"
as permissive
for insert
to authenticated
with check ((company_id = (SELECT auth.uid())));

create policy "offer_draft_select_own"
on "public"."company_offer_draft"
as permissive
for select
to authenticated
using ((company_id = (SELECT auth.uid())));

create policy "offer_draft_update_own"
on "public"."company_offer_draft"
as permissive
for update
to authenticated
using ((company_id = (SELECT auth.uid())))
with check ((company_id = (SELECT auth.uid())));

create policy "offer_capabilities_delete_owner"
on "public"."offer_capabilities"
as permissive
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_capabilities.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))));

create policy "offer_capabilities_insert_owner"
on "public"."offer_capabilities"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_capabilities.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))));

create policy "offer_capabilities_select_public"
on "public"."offer_capabilities"
as permissive
for select
to authenticated
using (true);

create policy "offer_capabilities_update_owner"
on "public"."offer_capabilities"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_capabilities.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))))
with check ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_capabilities.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))));

create policy "offer_locations_delete_owner"
on "public"."offer_locations"
as permissive
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_locations.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))));

create policy "offer_locations_insert_owner"
on "public"."offer_locations"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_locations.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))));

create policy "offer_locations_select_public"
on "public"."offer_locations"
as permissive
for select
to authenticated
using (true);

create policy "offer_locations_update_owner"
on "public"."offer_locations"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_locations.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))))
with check ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_locations.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))));

create policy "offer_perks_delete_owner"
on "public"."offer_perks"
as permissive
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_perks.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))));

create policy "offer_perks_insert_owner"
on "public"."offer_perks"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_perks.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))));

create policy "offer_perks_select_public"
on "public"."offer_perks"
as permissive
for select
to authenticated
using (true);

create policy "offer_perks_update_owner"
on "public"."offer_perks"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_perks.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))))
with check ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_perks.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))));

create policy "offer_questions_delete_owner"
on "public"."offer_questions"
as permissive
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_questions.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))));

create policy "offer_questions_insert_owner"
on "public"."offer_questions"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_questions.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))));

create policy "offer_questions_select_public"
on "public"."offer_questions"
as permissive
for select
to authenticated
using (true);

create policy "offer_questions_update_owner"
on "public"."offer_questions"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_questions.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))))
with check ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_questions.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))));

create policy "offer_responsibilities_delete_owner"
on "public"."offer_responsibilities"
as permissive
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_responsibilities.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))));

create policy "offer_responsibilities_insert_owner"
on "public"."offer_responsibilities"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_responsibilities.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))));

create policy "offer_responsibilities_select_public"
on "public"."offer_responsibilities"
as permissive
for select
to authenticated
using (true);

create policy "offer_responsibilities_update_owner"
on "public"."offer_responsibilities"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_responsibilities.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))))
with check ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_responsibilities.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))));

create policy "offer_skills_delete_owner"
on "public"."offer_skills"
as permissive
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_skills.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))));

create policy "offer_skills_insert_owner"
on "public"."offer_skills"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_skills.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))));

create policy "offer_skills_select_public"
on "public"."offer_skills"
as permissive
for select
to authenticated
using (true);

create policy "offer_skills_update_owner"
on "public"."offer_skills"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_skills.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))))
with check ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = offer_skills.offer_id) AND (company_offer.company_id = (SELECT auth.uid()))))));
