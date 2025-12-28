revoke update on table "public"."company" from "authenticated";

revoke update on table "public"."profile_searched" from "authenticated";

revoke update on table "public"."student" from "authenticated";

alter table "public"."company" drop constraint "company_user_id_fkey";

alter table "public"."company" drop constraint "company_user_id_key";

alter table "public"."profile_searched" drop constraint "profile_searched_offer_id_fkey";

alter table "public"."student" drop constraint "student_user_id_fkey";

alter table "public"."academic" drop constraint "academic_student_id_fkey";

alter table "public"."application" drop constraint "application_offer_id_fkey";

alter table "public"."application" drop constraint "application_student_id_fkey";

alter table "public"."company_offer" drop constraint "company_offer_company_id_fkey";

alter table "public"."experience" drop constraint "experience_student_id_fkey";

alter table "public"."resume" drop constraint "resume_student_id_fkey";

drop index if exists "public"."company_user_id_key";

alter table "public"."company" drop column "user_id";

alter table "public"."profile_searched" drop column "offer_id";

alter table "public"."student" drop column "student_name";

alter table "public"."student" drop column "user_id";

alter table "public"."student" add column "description" text;

alter table "public"."student" add column "first_name" text;

alter table "public"."student" add column "last_name" text;

alter table "public"."company" add constraint "company_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON UPDATE RESTRICT ON DELETE CASCADE not valid;

alter table "public"."company" validate constraint "company_id_fkey";

alter table "public"."profile_searched" add constraint "profile_searched_id_fkey" FOREIGN KEY (id) REFERENCES public.company_offer(id) ON UPDATE RESTRICT ON DELETE CASCADE not valid;

alter table "public"."profile_searched" validate constraint "profile_searched_id_fkey";

alter table "public"."student" add constraint "student_description_check" CHECK ((length(description) <= 500)) not valid;

alter table "public"."student" validate constraint "student_description_check";

alter table "public"."student" add constraint "student_first_name_check" CHECK ((length(first_name) <= 50)) not valid;

alter table "public"."student" validate constraint "student_first_name_check";

alter table "public"."student" add constraint "student_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON UPDATE RESTRICT ON DELETE CASCADE not valid;

alter table "public"."student" validate constraint "student_id_fkey";

alter table "public"."student" add constraint "student_last_name_check" CHECK ((length(last_name) <= 50)) not valid;

alter table "public"."student" validate constraint "student_last_name_check";

alter table "public"."academic" add constraint "academic_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.student(id) ON UPDATE RESTRICT ON DELETE CASCADE not valid;

alter table "public"."academic" validate constraint "academic_student_id_fkey";

alter table "public"."application" add constraint "application_offer_id_fkey" FOREIGN KEY (offer_id) REFERENCES public.company_offer(id) ON UPDATE RESTRICT ON DELETE CASCADE not valid;

alter table "public"."application" validate constraint "application_offer_id_fkey";

alter table "public"."application" add constraint "application_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.student(id) ON UPDATE RESTRICT ON DELETE CASCADE not valid;

alter table "public"."application" validate constraint "application_student_id_fkey";

alter table "public"."company_offer" add constraint "company_offer_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.company(id) ON UPDATE RESTRICT ON DELETE CASCADE not valid;

alter table "public"."company_offer" validate constraint "company_offer_company_id_fkey";

alter table "public"."experience" add constraint "experience_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.student(id) ON UPDATE RESTRICT ON DELETE CASCADE not valid;

alter table "public"."experience" validate constraint "experience_student_id_fkey";

alter table "public"."resume" add constraint "resume_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.student(id) ON UPDATE RESTRICT ON DELETE CASCADE not valid;

alter table "public"."resume" validate constraint "resume_student_id_fkey";


  create policy "Enable users to do anything with their own data"
  on "public"."academic"
  as permissive
  for all
  to authenticated
using ((student_id = auth.uid()))
with check ((student_id = auth.uid()));



  create policy "Enable companies to see the applications associated to themselv"
  on "public"."application"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = application.offer_id) AND (company_offer.company_id = ( SELECT auth.uid() AS uid))))));



  create policy "Enable students to see the applications associated to themselve"
  on "public"."application"
  as permissive
  for select
  to authenticated
using ((student_id = auth.uid()));



  create policy "Enable students to see company profiles"
  on "public"."company"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.student
  WHERE (student.id = ( SELECT auth.uid() AS uid)))));



  create policy "Enable users to update their own data only"
  on "public"."company"
  as permissive
  for update
  to authenticated
using ((( SELECT auth.uid() AS uid) = id))
with check ((( SELECT auth.uid() AS uid) = id));



  create policy "Enable users to view their own data only"
  on "public"."company"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = id));



  create policy "Enable elligible students (application table) to see the  offer"
  on "public"."company_offer"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.application
  WHERE ((company_offer.id = application.offer_id) AND (application.student_id = ( SELECT auth.uid() AS uid))))));



  create policy "Enable users to do anything with their own data"
  on "public"."company_offer"
  as permissive
  for all
  to authenticated
using ((company_id = auth.uid()))
with check ((company_id = auth.uid()));



  create policy "Enable users to do anything with their own data"
  on "public"."experience"
  as permissive
  for all
  to authenticated
using ((student_id = auth.uid()))
with check ((student_id = auth.uid()));



  create policy "Enable companies to do anything with their own data"
  on "public"."profile_searched"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.company_offer
  WHERE ((company_offer.id = profile_searched.id) AND (company_offer.company_id = ( SELECT auth.uid() AS uid))))));



  create policy "Enable users to do anything with their own data"
  on "public"."resume"
  as permissive
  for all
  to authenticated
using ((student_id = auth.uid()))
with check ((student_id = auth.uid()));



  create policy "Enable users to update their own data"
  on "public"."student"
  as permissive
  for update
  to authenticated
using ((id = auth.uid()))
with check ((id = auth.uid()));



  create policy "Enable users to view their own data only"
  on "public"."student"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = id));



