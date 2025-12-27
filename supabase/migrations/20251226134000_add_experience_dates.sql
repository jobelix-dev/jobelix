-- Add starting_date and ending_date to experience table
ALTER TABLE "public"."experience" 
ADD COLUMN "starting_date" date,
ADD COLUMN "ending_date" date;

-- Add check constraint for date validity (ending must be after starting)
ALTER TABLE "public"."experience"
ADD CONSTRAINT "experience_date_order_check" 
CHECK (ending_date IS NULL OR starting_date IS NULL OR ending_date >= starting_date);

COMMENT ON COLUMN "public"."experience"."starting_date" IS 'Start date of the work experience';
COMMENT ON COLUMN "public"."experience"."ending_date" IS 'End date of the work experience, NULL if currently working';
