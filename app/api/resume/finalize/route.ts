/**
 * Finalize Profile API Route
 * 
 * Transfers validated data from draft to permanent student/academic/experience tables.
 * Route: POST /api/resume/finalize
 * Called by: StudentDashboard after all fields are validated
 * Creates: student, academic_background, and work_experience entries
 * Normalizes: Dates to PostgreSQL format (YYYY-MM-DD)
 * Deletes: student_profile_draft after successful transfer
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

/**
 * Normalize date strings to PostgreSQL date format (YYYY-MM-DD)
 * Handles formats: "YYYY-MM-DD", "YYYY-MM", "YYYY"
 * Returns null if date is invalid or null
 * 
 * @param dateStr - The date string to normalize
 * @param isEndDate - If true, use end of period for partial dates (e.g., Dec 31 for year-only)
 */
function normalizeDateForDB(dateStr: string | null | undefined, isEndDate: boolean = false): string | null {
  if (!dateStr) return null;
  
  const trimmed = dateStr.trim();
  
  // Already in correct format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  // Year-Month format (YYYY-MM) -> use first or last day of month
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    if (isEndDate) {
      // Get last day of the month
      const [year, month] = trimmed.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate(); // Day 0 of next month = last day of current month
      return `${trimmed}-${String(lastDay).padStart(2, '0')}`;
    } else {
      return `${trimmed}-01`;
    }
  }
  
  // Year only (YYYY) -> use January 1st or December 31st
  if (/^\d{4}$/.test(trimmed)) {
    return isEndDate ? `${trimmed}-12-31` : `${trimmed}-01-01`;
  }
  
  // Invalid format
  console.warn(`Invalid date format: "${dateStr}", setting to null`);
  return null;
}

/**
 * Helper function to save education and experience records
 */
async function saveEducationAndExperience(supabase: any, studentId: string, draft: any) {
  // Insert education records
  if (draft.education && Array.isArray(draft.education)) {
    // Delete existing education records for this student
    await supabase
      .from('academic')
      .delete()
      .eq('student_id', studentId)

    // Insert new education records with normalized dates
    const educationRecords = draft.education.map((edu: any) => ({
      student_id: studentId,
      school_name: edu.school_name,
      degree: edu.degree,
      description: edu.description || null,
      starting_date: normalizeDateForDB(edu.starting_date, false),
      ending_date: normalizeDateForDB(edu.ending_date, true),
    }))

    if (educationRecords.length > 0) {
      const { error: eduError } = await supabase
        .from('academic')
        .insert(educationRecords)

      if (eduError) {
        console.error('Failed to insert education:', eduError)
        throw new Error('Failed to save education records')
      }
    }
  }

  // Insert experience records
  if (draft.experience && Array.isArray(draft.experience)) {
    // Delete existing experience records for this student
    await supabase
      .from('experience')
      .delete()
      .eq('student_id', studentId)

    // Insert new experience records with normalized dates
    const experienceRecords = draft.experience.map((exp: any) => {
      const startDate = normalizeDateForDB(exp.starting_date, false)
      const endDate = normalizeDateForDB(exp.ending_date, true)
      
      // Log date conversion for debugging
      console.log('Experience date conversion:', {
        organisation: exp.organisation_name,
        original: { starting_date: exp.starting_date, ending_date: exp.ending_date },
        normalized: { starting_date: startDate, ending_date: endDate }
      })
      
      return {
        student_id: studentId,
        organisation_name: exp.organisation_name,
        position_name: exp.position_name,
        description: exp.description || null,
        starting_date: startDate,
        ending_date: endDate,
      }
    })

    if (experienceRecords.length > 0) {
      console.log('Attempting to insert experience records:', experienceRecords)
      
      const { error: expError } = await supabase
        .from('experience')
        .insert(experienceRecords)

      if (expError) {
        console.error('Failed to insert experience:', expError)
        console.error('Experience records that failed:', experienceRecords)
        throw new Error('Failed to save experience records: ' + expError.message)
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { draftId } = await request.json()

    if (!draftId) {
      return NextResponse.json(
        { error: 'Draft ID required' },
        { status: 400 }
      )
    }

    // Get the draft
    const { data: draft, error: draftError } = await supabase
      .from('student_profile_draft')
      .select('*')
      .eq('id', draftId)
      .eq('student_id', user.id)
      .single()

    if (draftError || !draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    // Parse student name into first_name and last_name
    let firstName = null
    let lastName = null
    if (draft.student_name) {
      const nameParts = draft.student_name.trim().split(/\s+/)
      if (nameParts.length === 1) {
        firstName = nameParts[0]
      } else if (nameParts.length >= 2) {
        firstName = nameParts[0]
        lastName = nameParts.slice(1).join(' ')
      }
    }

    // Update student table with name, phone, email, and address
    const studentUpdates: any = {}
    if (firstName) studentUpdates.first_name = firstName
    if (lastName) studentUpdates.last_name = lastName
    if (draft.phone_number) studentUpdates.phone_number = draft.phone_number
    if (draft.email) studentUpdates.mail_adress = draft.email // mail_adress is the email column
    if (draft.address) studentUpdates.address = draft.address
    
    if (Object.keys(studentUpdates).length > 0) {
      console.log('Attempting student update with:', {
        userId: user.id,
        updates: studentUpdates
      })
      
      // Check if a student record already exists for this auth user (using id = user.id)
      const { data: existingStudent } = await supabase
        .from('student')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()
      
      let studentError;
      let studentId: string;
      
      if (existingStudent) {
        // Update existing student record
        const { error } = await supabase
          .from('student')
          .update(studentUpdates)
          .eq('id', user.id)
        
        studentError = error;
        studentId = existingStudent.id;
        console.log('Student update successful for existing record, student.id:', studentId)
      } else {
        // Insert new student record with id = user.id (auth user's UUID)
        const { data: newStudent, error } = await supabase
          .from('student')
          .insert({
            id: user.id,  // Use auth user's ID as the student's primary key
            ...studentUpdates
          })
          .select('id')
          .single()
        
        studentError = error;
        studentId = newStudent?.id || '';
        console.log('Student insert successful for new record, student.id:', studentId)
      }
      
      if (studentError || !studentId) {
        console.error('Failed to save student:', studentError)
        console.error('User ID:', user.id)
        console.error('Updates:', studentUpdates)
        return NextResponse.json(
          { error: 'Failed to save student information', details: studentError?.message },
          { status: 500 }
        )
      }
      
      // Use studentId for foreign key relationships in academic and experience tables
      try {
        await saveEducationAndExperience(supabase, studentId, draft);
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }
    } else {
      // If no student updates, we still need to get the student ID
      const { data: existingStudent } = await supabase
        .from('student')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()
      
      if (!existingStudent) {
        return NextResponse.json(
          { error: 'Student record not found. Please update your profile first.' },
          { status: 404 }
        )
      }
      
      try {
        await saveEducationAndExperience(supabase, existingStudent.id, draft);
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }
    }

    // Mark draft as confirmed
    await supabase
      .from('student_profile_draft')
      .update({ status: 'confirmed' })
      .eq('id', draftId)
      .eq('student_id', user.id)

    return NextResponse.json({
      success: true,
      message: 'Profile data saved successfully',
    })
  } catch (error: any) {
    console.error('Finalize profile error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to finalize profile' },
      { status: 500 }
    )
  }
}
