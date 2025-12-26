-- Create draft table for temporary storage during resume extraction
CREATE TABLE IF NOT EXISTS "public"."student_profile_draft" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "student_id" uuid NOT NULL REFERENCES "public"."student"("id") ON DELETE CASCADE,
    
    -- Raw extracted text from resume
    "raw_resume_text" text,
    
    -- Student basic info (will update student table)
    "student_name" text,
    
    -- Education array stored as JSONB for flexibility during extraction
    "education" jsonb DEFAULT '[]'::jsonb,
    
    -- Work experience array stored as JSONB
    "experience" jsonb DEFAULT '[]'::jsonb,
    
    -- Extraction metadata
    "extraction_confidence" jsonb,
    
    -- Chat conversation history
    "chat_history" jsonb DEFAULT '[]'::jsonb,
    
    -- Workflow status
    "status" text DEFAULT 'extracting' CHECK (status IN ('extracting', 'reviewing', 'confirmed')),
    
    -- Timestamps
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "student_profile_draft_student_id_idx" ON "public"."student_profile_draft"("student_id");

-- Add RLS policies
ALTER TABLE "public"."student_profile_draft" ENABLE ROW LEVEL SECURITY;

-- Students can only see/modify their own drafts
CREATE POLICY "Students can manage their own profile drafts"
    ON "public"."student_profile_draft"
    FOR ALL
    USING (student_id = auth.uid());

-- Add comment
COMMENT ON TABLE "public"."student_profile_draft" IS 'Temporary storage for resume data during AI extraction and conversational validation';
