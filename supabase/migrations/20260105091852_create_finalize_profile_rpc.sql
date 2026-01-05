-- Create RPC function to finalize student profile atomically
-- This function handles all database operations in a single transaction

CREATE OR REPLACE FUNCTION finalize_student_profile(
  p_user_id uuid,
  p_student jsonb,
  p_education jsonb,
  p_experience jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Step 1: Delete existing child records (CASCADE will handle dependencies)
  DELETE FROM experience WHERE student_id = p_user_id;
  DELETE FROM academic WHERE student_id = p_user_id;
  
  -- Step 2: Upsert student record
  INSERT INTO student (
    id,
    first_name,
    last_name,
    phone_number,
    mail_adress,
    address
  ) VALUES (
    p_user_id,
    (p_student->>'first_name')::text,
    (p_student->>'last_name')::text,
    (p_student->>'phone_number')::text,
    (p_student->>'mail_adress')::text,
    (p_student->>'address')::text
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone_number = EXCLUDED.phone_number,
    mail_adress = EXCLUDED.mail_adress,
    address = EXCLUDED.address;
  
  -- Step 3: Insert education records (if any)
  IF jsonb_array_length(p_education) > 0 THEN
    INSERT INTO academic (
      student_id,
      school_name,
      degree,
      description,
      start_year,
      start_month,
      end_year,
      end_month
    )
    SELECT
      p_user_id,
      (elem->>'school_name')::text,
      (elem->>'degree')::text,
      (elem->>'description')::text,
      (elem->>'start_year')::integer,
      (elem->>'start_month')::integer,
      (elem->>'end_year')::integer,
      (elem->>'end_month')::integer
    FROM jsonb_array_elements(p_education) AS elem;
  END IF;
  
  -- Step 4: Insert experience records (if any)
  IF jsonb_array_length(p_experience) > 0 THEN
    INSERT INTO experience (
      student_id,
      organisation_name,
      position_name,
      description,
      start_year,
      start_month,
      end_year,
      end_month
    )
    SELECT
      p_user_id,
      (elem->>'organisation_name')::text,
      (elem->>'position_name')::text,
      (elem->>'description')::text,
      (elem->>'start_year')::integer,
      (elem->>'start_month')::integer,
      (elem->>'end_year')::integer,
      (elem->>'end_month')::integer
    FROM jsonb_array_elements(p_experience) AS elem;
  END IF;
  
  -- Return success with counts
  v_result := jsonb_build_object(
    'success', true,
    'student_id', p_user_id,
    'education_count', jsonb_array_length(p_education),
    'experience_count', jsonb_array_length(p_experience)
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION finalize_student_profile TO authenticated;

-- Add comment
COMMENT ON FUNCTION finalize_student_profile IS 
'Atomically finalizes student profile by upserting student record and inserting education/experience entries. All operations happen in a single transaction.';
