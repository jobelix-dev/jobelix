-- Update language proficiency constraint to use capitalized values and add Fluent
ALTER TABLE "public"."language"
DROP CONSTRAINT "language_proficiency_check";

ALTER TABLE "public"."language"
ADD CONSTRAINT "language_proficiency_check" CHECK (
    proficiency_level IS NULL OR 
    proficiency_level IN ('Beginner', 'Intermediate', 'Advanced', 'Fluent', 'Native')
);

-- Update comment to reflect new values
COMMENT ON COLUMN "public"."language"."proficiency_level" IS 'Proficiency level: Beginner, Intermediate, Advanced, Fluent, Native';
