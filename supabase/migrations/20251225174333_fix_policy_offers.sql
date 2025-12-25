drop policy "Enable users to do anything with their own data" on "public"."company_offer";


  create policy "Companies can manage their own offers"
  on "public"."company_offer"
  as permissive
  for all
  to authenticated
using ((company_id = auth.uid()))
with check ((company_id = auth.uid()));



