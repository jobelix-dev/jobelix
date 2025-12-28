drop policy "Enable users to do anything with their own data" on "public"."academic";

drop policy "Enable students to see the applications associated to themselve" on "public"."application";

drop policy "Companies can manage their own offers" on "public"."company_offer";

drop policy "Enable users to do anything with their own data" on "public"."experience";

drop policy "Enable users to do anything with their own data" on "public"."resume";

drop policy "Enable users to update their own data" on "public"."student";


  create policy "Enable users to do anything with their own data"
  on "public"."academic"
  as permissive
  for all
  to authenticated
using ((student_id = ( SELECT auth.uid() AS uid)))
with check ((student_id = ( SELECT auth.uid() AS uid)));



  create policy "Enable students to see the applications associated to themselve"
  on "public"."application"
  as permissive
  for select
  to authenticated
using ((student_id = ( SELECT auth.uid() AS uid)));



  create policy "Companies can manage their own offers"
  on "public"."company_offer"
  as permissive
  for all
  to authenticated
using ((company_id = ( SELECT auth.uid() AS uid)))
with check ((company_id = ( SELECT auth.uid() AS uid)));



  create policy "Enable users to do anything with their own data"
  on "public"."experience"
  as permissive
  for all
  to authenticated
using ((student_id = ( SELECT auth.uid() AS uid)))
with check ((student_id = ( SELECT auth.uid() AS uid)));



  create policy "Enable users to do anything with their own data"
  on "public"."resume"
  as permissive
  for all
  to authenticated
using ((student_id = ( SELECT auth.uid() AS uid)))
with check ((student_id = ( SELECT auth.uid() AS uid)));



  create policy "Enable users to update their own data"
  on "public"."student"
  as permissive
  for update
  to authenticated
using ((id = ( SELECT auth.uid() AS uid)))
with check ((id = ( SELECT auth.uid() AS uid)));



