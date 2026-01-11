-- Migration: Update finalize_student_profile to handle new social_links structure
-- Changes from array of {link} to single object {github, linkedin, stackoverflow, kaggle, leetcode}
-- Based on original working version from 20260105151801

-- Drop existing function (may have different signatures)
DROP FUNCTION IF EXISTS finalize_student_profile;

CREATE OR REPLACE FUNCTION finalize_student_profile(
  p_user_id uuid,
  p_profile jsonb,
  p_education jsonb,
  p_experience jsonb,
  p_projects jsonb,
  p_skills jsonb,
  p_languages jsonb,
  p_publications jsonb,
  p_certifications jsonb,
  p_social_links jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_education_count int;
  v_experience_count int;
  v_projects_count int;
  v_skills_count int;
  v_languages_count int;
  v_publications_count int;
  v_certifications_count int;
  v_social_links_count int;
BEGIN
  -- Upsert student record
  INSERT INTO student (
    id,
    student_name,
    first_name,
    last_name,
    mail_adress,
    phone_number,
    address
  )
  VALUES (
    p_user_id,
    (p_profile->>'student_name')::text,
    (p_profile->>'first_name')::text,
    (p_profile->>'last_name')::text,
    (p_profile->>'mail_adress')::text,
    (p_profile->>'phone_number')::text,
    (p_profile->>'address')::text
  )
  ON CONFLICT (id) DO UPDATE SET
    student_name = EXCLUDED.student_name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    mail_adress = EXCLUDED.mail_adress,
    phone_number = EXCLUDED.phone_number,
    address = EXCLUDED.address;
  
  -- Delete existing related records before inserting new ones
  DELETE FROM academic WHERE student_id = p_user_id;
  DELETE FROM experience WHERE student_id = p_user_id;
  DELETE FROM project WHERE student_id = p_user_id;
  DELETE FROM skill WHERE student_id = p_user_id;
  DELETE FROM language WHERE student_id = p_user_id;
  DELETE FROM publication WHERE student_id = p_user_id;
  DELETE FROM certification WHERE student_id = p_user_id;
  DELETE FROM social_link WHERE student_id = p_user_id;
  
  -- Insert education records
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
    (elem->>'start_year')::int,
    (elem->>'start_month')::int,
    (elem->>'end_year')::int,
    (elem->>'end_month')::int
  FROM jsonb_array_elements(p_education) AS elem
  WHERE (elem->>'school_name')::text IS NOT NULL 
    AND (elem->>'school_name')::text != ''
    AND (elem->>'degree')::text IS NOT NULL 
    AND (elem->>'degree')::text != '';
  
  GET DIAGNOSTICS v_education_count = ROW_COUNT;
  
  -- Insert experience records
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
    (elem->>'start_year')::int,
    (elem->>'start_month')::int,
    (elem->>'end_year')::int,
    (elem->>'end_month')::int
  FROM jsonb_array_elements(p_experience) AS elem
  WHERE (elem->>'organisation_name')::text IS NOT NULL 
    AND (elem->>'organisation_name')::text != ''
    AND (elem->>'position_name')::text IS NOT NULL 
    AND (elem->>'position_name')::text != '';
  
  GET DIAGNOSTICS v_experience_count = ROW_COUNT;
  
  -- Insert project records
  INSERT INTO project (
    student_id,
    project_name,
    description,
    link
  )
  SELECT 
    p_user_id,
    (elem->>'project_name')::text,
    (elem->>'description')::text,
    (elem->>'link')::text
  FROM jsonb_array_elements(p_projects) AS elem
  WHERE (elem->>'project_name')::text IS NOT NULL 
    AND (elem->>'project_name')::text != '';
  
  GET DIAGNOSTICS v_projects_count = ROW_COUNT;
  
  -- Insert skill records
  INSERT INTO skill (
    student_id,
    skill_name,
    skill_slug
  )
  SELECT 
    p_user_id,
    (elem->>'skill_name')::text,
    (elem->>'skill_slug')::text
  FROM jsonb_array_elements(p_skills) AS elem
  WHERE (elem->>'skill_name')::text IS NOT NULL 
    AND (elem->>'skill_name')::text != ''
    AND (elem->>'skill_slug')::text IS NOT NULL 
    AND (elem->>'skill_slug')::text != '';
  
  GET DIAGNOSTICS v_skills_count = ROW_COUNT;
  
  -- Insert language records
  INSERT INTO language (
    student_id,
    language_name,
    proficiency_level
  )
  SELECT 
    p_user_id,
    (elem->>'language_name')::text,
    (elem->>'proficiency_level')::text
  FROM jsonb_array_elements(p_languages) AS elem
  WHERE (elem->>'language_name')::text IS NOT NULL 
    AND (elem->>'language_name')::text != ''
    AND (elem->>'proficiency_level')::text IS NOT NULL 
    AND (elem->>'proficiency_level')::text != '';
  
  GET DIAGNOSTICS v_languages_count = ROW_COUNT;
  
  -- Insert publication records
  INSERT INTO publication (
    student_id,
    title,
    journal_name,
    description,
    publication_year,
    publication_month,
    link
  )
  SELECT 
    p_user_id,
    (elem->>'title')::text,
    (elem->>'journal_name')::text,
    (elem->>'description')::text,
    (elem->>'publication_year')::int,
    (elem->>'publication_month')::int,
    (elem->>'link')::text
  FROM jsonb_array_elements(p_publications) AS elem
  WHERE (elem->>'title')::text IS NOT NULL 
    AND (elem->>'title')::text != '';
  
  GET DIAGNOSTICS v_publications_count = ROW_COUNT;
  
  -- Insert certification records
  INSERT INTO certification (
    student_id,
    name,
    issuing_organization,
    url
  )
  SELECT 
    p_user_id,
    (elem->>'name')::text,
    (elem->>'issuing_organization')::text,
    (elem->>'url')::text
  FROM jsonb_array_elements(p_certifications) AS elem
  WHERE (elem->>'name')::text IS NOT NULL 
    AND (elem->>'name')::text != '';
  
  GET DIAGNOSTICS v_certifications_count = ROW_COUNT;
  
  -- Insert social link record (NEW: platform-specific columns)
  -- p_social_links is now an object: {github: "url", linkedin: "url", stackoverflow: "url", kaggle: "url", leetcode: "url"}
  IF p_social_links IS NOT NULL AND jsonb_typeof(p_social_links) = 'object' THEN
    -- Check if at least one platform has a value
    IF (p_social_links->>'github') IS NOT NULL 
       OR (p_social_links->>'linkedin') IS NOT NULL
       OR (p_social_links->>'stackoverflow') IS NOT NULL
       OR (p_social_links->>'kaggle') IS NOT NULL
       OR (p_social_links->>'leetcode') IS NOT NULL
    THEN
      INSERT INTO social_link (
        student_id,
        github,
        linkedin,
        stackoverflow,
        kaggle,
        leetcode
      )
      VALUES (
        p_user_id,
        NULLIF(TRIM(p_social_links->>'github'), ''),
        NULLIF(TRIM(p_social_links->>'linkedin'), ''),
        NULLIF(TRIM(p_social_links->>'stackoverflow'), ''),
        NULLIF(TRIM(p_social_links->>'kaggle'), ''),
        NULLIF(TRIM(p_social_links->>'leetcode'), '')
      );
      
      v_social_links_count := 1;
    ELSE
      v_social_links_count := 0;
    END IF;
  ELSE
    v_social_links_count := 0;
  END IF;
  
  -- Return success with counts
  RETURN jsonb_build_object(
    'success', true,
    'education_count', v_education_count,
    'experience_count', v_experience_count,
    'projects_count', v_projects_count,
    'skills_count', v_skills_count,
    'languages_count', v_languages_count,
    'publications_count', v_publications_count,
    'certifications_count', v_certifications_count,
    'social_links_count', v_social_links_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION finalize_student_profile TO authenticated;

COMMENT ON FUNCTION finalize_student_profile IS 'Atomically finalizes student profile with all extended fields including projects, skills, languages, publications, certifications, and social links (platform-specific: GitHub, LinkedIn, StackOverflow, Kaggle, LeetCode)';
