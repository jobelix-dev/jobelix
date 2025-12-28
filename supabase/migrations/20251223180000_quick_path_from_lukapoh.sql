BEGIN;

-- ----------------------------------------------------------------
-- 1. Modifications de la table "resume"
-- ----------------------------------------------------------------

-- D'abord, on retire la contrainte de clé primaire existante
ALTER TABLE "public"."resume" 
DROP CONSTRAINT IF EXISTS "resume_pkey";

-- Ensuite, on supprime la colonne "id" qui ne sert plus
ALTER TABLE "public"."resume" 
DROP COLUMN IF EXISTS "id";

-- Enfin, on définit la nouvelle clé primaire sur "student_id"
ALTER TABLE "public"."resume" 
ADD CONSTRAINT "resume_pkey" PRIMARY KEY ("student_id");


-- ----------------------------------------------------------------
-- 2. Mise à jour des politiques (RLS) sur "company_offer"
-- ----------------------------------------------------------------

-- Suppression de l'ancienne politique (Note: le nom doit correspondre exactement)
DROP POLICY IF EXISTS "Enable elligible students (application table) to see the  offer" 
ON "public"."company_offer";

-- Création de la nouvelle politique permissive
CREATE POLICY "Students can view all offers"
ON "public"."company_offer"
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);

COMMIT;