


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  user_role text;
begin
  user_role := new.raw_user_meta_data ->> 'role';

  IF user_role = 'company' THEN
    insert into public.company (id, mail_adress)
    values (new.id, new.email);
    
  ELSIF user_role = 'student' THEN
    insert into public.student (id, mail_adress)
    values (new.id, new.email);
    
  ELSE
    RAISE WARNING 'Unknown role during subscribing: %', user_role;
  END IF;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end; $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."academic" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "student_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_name" "text" NOT NULL,
    "degree" "text" NOT NULL,
    "description" "text",
    "starting_date" "date",
    "ending_date" "date"
);


ALTER TABLE "public"."academic" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."application" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "offer_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "curent_state" "text" DEFAULT '"unseen"'::"text" NOT NULL,
    "priority" smallint DEFAULT '0'::smallint NOT NULL
);


ALTER TABLE "public"."application" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_name" "text",
    "description" "text",
    "mail_adress" "text" NOT NULL
);


ALTER TABLE "public"."company" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_offer" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "position_name" "text" NOT NULL,
    "description" "text",
    "wage" smallint,
    "starting_date" timestamp with time zone
);


ALTER TABLE "public"."company_offer" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."experience" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "student_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_name" "text" NOT NULL,
    "position_name" "text" NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."experience" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profile_searched" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "offer_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "academics" "text",
    "experience" "text",
    "difficulty" smallint
);


ALTER TABLE "public"."profile_searched" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resume" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL
);


ALTER TABLE "public"."resume" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "student_name" "text",
    "mail_adress" "text" NOT NULL
);


ALTER TABLE "public"."student" OWNER TO "postgres";


ALTER TABLE ONLY "public"."academic"
    ADD CONSTRAINT "academic_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."application"
    ADD CONSTRAINT "application_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_offer"
    ADD CONSTRAINT "company_offer_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company"
    ADD CONSTRAINT "company_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company"
    ADD CONSTRAINT "company_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."experience"
    ADD CONSTRAINT "experience_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_searched"
    ADD CONSTRAINT "profile_searched_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resume"
    ADD CONSTRAINT "resume_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student"
    ADD CONSTRAINT "student_mail_adress_key" UNIQUE ("mail_adress");



ALTER TABLE ONLY "public"."student"
    ADD CONSTRAINT "student_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."academic"
    ADD CONSTRAINT "academic_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."application"
    ADD CONSTRAINT "application_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."company_offer"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."application"
    ADD CONSTRAINT "application_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_offer"
    ADD CONSTRAINT "company_offer_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company"
    ADD CONSTRAINT "company_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."experience"
    ADD CONSTRAINT "experience_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_searched"
    ADD CONSTRAINT "profile_searched_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."company_offer"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resume"
    ADD CONSTRAINT "resume_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student"
    ADD CONSTRAINT "student_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE "public"."academic" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."application" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_offer" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."experience" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profile_searched" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resume" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."academic" TO "anon";
GRANT ALL ON TABLE "public"."academic" TO "authenticated";
GRANT ALL ON TABLE "public"."academic" TO "service_role";



GRANT ALL ON TABLE "public"."application" TO "anon";
GRANT ALL ON TABLE "public"."application" TO "authenticated";
GRANT ALL ON TABLE "public"."application" TO "service_role";



GRANT ALL ON TABLE "public"."company" TO "anon";
GRANT ALL ON TABLE "public"."company" TO "authenticated";
GRANT ALL ON TABLE "public"."company" TO "service_role";



GRANT ALL ON TABLE "public"."company_offer" TO "anon";
GRANT ALL ON TABLE "public"."company_offer" TO "authenticated";
GRANT ALL ON TABLE "public"."company_offer" TO "service_role";



GRANT ALL ON TABLE "public"."experience" TO "anon";
GRANT ALL ON TABLE "public"."experience" TO "authenticated";
GRANT ALL ON TABLE "public"."experience" TO "service_role";



GRANT ALL ON TABLE "public"."profile_searched" TO "anon";
GRANT ALL ON TABLE "public"."profile_searched" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_searched" TO "service_role";



GRANT ALL ON TABLE "public"."resume" TO "anon";
GRANT ALL ON TABLE "public"."resume" TO "authenticated";
GRANT ALL ON TABLE "public"."resume" TO "service_role";



GRANT ALL ON TABLE "public"."student" TO "anon";
GRANT ALL ON TABLE "public"."student" TO "authenticated";
GRANT ALL ON TABLE "public"."student" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Allow read (download own resume) i5g8va_0"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'resumes'::text) AND ((auth.uid())::text = split_part(name, '/'::text, 1))));



  create policy "Allow update (replace resume) i5g8va_0"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'resumes'::text) AND ((auth.uid())::text = split_part(name, '/'::text, 1))));



  create policy "Students can upload their own resume i5g8va_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'resumes'::text) AND ((auth.uid())::text = split_part(name, '/'::text, 1))));



