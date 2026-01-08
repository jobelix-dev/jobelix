-- Create company_offer_draft table for temporary storage during offer creation/editing
-- Mirrors student_profile_draft pattern: JSONB for flexibility, strict types on publish

CREATE TABLE IF NOT EXISTS "public"."company_offer_draft" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "company_id" uuid NOT NULL REFERENCES "public"."company"("id") ON DELETE CASCADE,
    "offer_id" uuid REFERENCES "public"."company_offer"("id") ON DELETE SET NULL,
    
    -- Basic Info (JSONB for partial data during editing)
    "basic_info" jsonb DEFAULT '{
        "position_name": "",
        "description": null
    }'::jsonb,
    
    -- Compensation (JSONB allows partial/invalid states)
    "compensation" jsonb DEFAULT '{
        "salary_min": null,
        "salary_max": null,
        "salary_currency": "EUR",
        "salary_period": null,
        "equity": false,
        "equity_range": null
    }'::jsonb,
    
    -- Work Configuration (dates as {year, month} objects)
    "work_config" jsonb DEFAULT '{
        "remote_mode": null,
        "employment_type": null,
        "timezone_min": null,
        "timezone_max": null,
        "start_date": null,
        "availability": null
    }'::jsonb,
    
    -- Startup Signals (flexible during editing)
    "startup_signals" jsonb DEFAULT '{
        "mission": null,
        "stage": null,
        "team_size": null,
        "seniority": null
    }'::jsonb,
    
    -- Normalized arrays (JSONB during draft, no foreign keys)
    "skills" jsonb DEFAULT '[]'::jsonb,
    "locations" jsonb DEFAULT '[]'::jsonb,
    "responsibilities" jsonb DEFAULT '[]'::jsonb,
    "capabilities" jsonb DEFAULT '[]'::jsonb,
    "questions" jsonb DEFAULT '[]'::jsonb,
    "perks" jsonb DEFAULT '[]'::jsonb,
    
    -- Workflow status
    "status" text DEFAULT 'editing' CHECK (status IN ('editing', 'ready_to_publish')),
    
    -- Timestamps
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL
);

-- Create index for faster lookups by company
CREATE INDEX IF NOT EXISTS "company_offer_draft_company_id_idx" 
    ON "public"."company_offer_draft"("company_id");

-- Create index for lookups by linked offer
CREATE INDEX IF NOT EXISTS "company_offer_draft_offer_id_idx" 
    ON "public"."company_offer_draft"("offer_id");

-- Add RLS policies
ALTER TABLE "public"."company_offer_draft" ENABLE ROW LEVEL SECURITY;

-- Companies can only see/modify their own drafts
CREATE POLICY "Companies can manage their own offer drafts"
    ON "public"."company_offer_draft"
    FOR ALL
    TO authenticated
    USING (company_id = auth.uid())
    WITH CHECK (company_id = auth.uid());

-- Add comments
COMMENT ON TABLE "public"."company_offer_draft" IS 'Draft workspace for offer editing - permissive schema, JSONB fields, no validation until publish';
COMMENT ON COLUMN "public"."company_offer_draft"."offer_id" IS 'Links to published offer if editing existing (NULL for new offers)';
COMMENT ON COLUMN "public"."company_offer_draft"."work_config" IS 'Dates stored as {year, month} objects for flexible UI handling';
COMMENT ON COLUMN "public"."company_offer_draft"."skills" IS 'Array of {skill_slug, skill_text, importance, level, years}';
COMMENT ON COLUMN "public"."company_offer_draft"."locations" IS 'Array of {city, country, region, is_primary}';
COMMENT ON COLUMN "public"."company_offer_draft"."responsibilities" IS 'Array of {text}';
COMMENT ON COLUMN "public"."company_offer_draft"."capabilities" IS 'Array of {text, importance}';
COMMENT ON COLUMN "public"."company_offer_draft"."questions" IS 'Array of {question, type, is_required}';
COMMENT ON COLUMN "public"."company_offer_draft"."perks" IS 'Array of {text}';
