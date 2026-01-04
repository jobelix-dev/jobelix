/**
 * Student Profile API Route
 * 
 * Retrieves complete student profile including education and experience.
 * Route: GET /api/student/profile
 * Called by: StudentDashboard on mount to load existing data
 * Returns: Student info, education array, and experience array
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch student basic info
    const { data: studentData, error: studentError } = await supabase
      .from('student')
      .select('*')
      .eq('id', user.id)
      .single();

    if (studentError) {
      return NextResponse.json(
        { error: studentError.message },
        { status: 500 }
      );
    }

    // Fetch education entries
    const { data: educationData, error: educationError } = await supabase
      .from('academic')
      .select('*')
      .eq('student_id', user.id)
      .order('start_year', { ascending: false });

    if (educationError) {
      console.error('Education fetch error:', educationError);
    }

    // Fetch experience entries
    const { data: experienceData, error: experienceError } = await supabase
      .from('experience')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    if (experienceError) {
      console.error('Experience fetch error:', experienceError);
    }

    // Transform to match ExtractedResumeData format
    const profile = {
      student_name: studentData.student_name || null,
      phone_number: studentData.phone_number || null,
      email: studentData.mail_adress || null,
      address: studentData.address || null,
      education: (educationData || []).map((edu: any) => ({
        school: edu.school_name,
        degree: edu.degree,
        description: edu.description || '',
        start_year: edu.start_year,
        start_month: edu.start_month,
        end_year: edu.end_year,
        end_month: edu.end_month,
      })),
      experience: (experienceData || []).map((exp: any) => ({
        company: exp.organisation_name,
        position: exp.position_name,
        description: exp.description || '',
        start_year: exp.start_year,
        start_month: exp.start_month,
        end_year: exp.end_year,
        end_month: exp.end_month,
      })),
    };

    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
