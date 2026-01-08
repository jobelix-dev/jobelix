-- Create RPC function to publish an offer draft
-- Atomically copies draft data to normalized company_offer tables
-- Handles both new offers and updates to existing offers

CREATE OR REPLACE FUNCTION publish_offer_draft(p_draft_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  WHERE id = p_draft_id AND company_id = auth.uid();

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
$$;

-- Add comment
COMMENT ON FUNCTION publish_offer_draft(UUID) IS 
'Publishes an offer draft by copying data to normalized company_offer tables. 
Creates new offer if draft.offer_id IS NULL, updates existing offer otherwise.
Atomically handles main table and all child tables (skills, locations, etc).
Validates ownership via RLS and auth.uid().';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION publish_offer_draft(UUID) TO authenticated;
