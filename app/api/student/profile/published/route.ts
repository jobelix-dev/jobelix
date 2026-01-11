import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch student data
    // Note: The RPC stores user_id in the 'id' column of student table
    const { data: studentData, error: studentError } = await supabase
      .from('student')
      .select('*')
      .eq('id', user.id)
      .single();

    if (studentError) {
      console.error('Error fetching student:', studentError);
      return NextResponse.json({ 
        error: 'Student profile not found',
        details: studentError.message 
      }, { status: 404 });
    }

    if (!studentData) {
      console.error('No student data found for user:', user.id);
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const studentId = studentData.id;

    // Fetch all related data
    const [
      { data: academic, error: academicError },
      { data: experience, error: experienceError },
      { data: projects, error: projectsError },
      { data: skills, error: skillsError },
      { data: languages, error: languagesError },
      { data: certifications, error: certificationsError },
      { data: socialLinks, error: socialLinksError }
    ] = await Promise.all([
      supabase.from('academic').select('*').eq('student_id', studentId),
      supabase.from('experience').select('*').eq('student_id', studentId),
      supabase.from('project').select('*').eq('student_id', studentId),
      supabase.from('skill').select('*').eq('student_id', studentId),
      supabase.from('language').select('*').eq('student_id', studentId),
      supabase.from('certification').select('*').eq('student_id', studentId),
      supabase.from('social_link').select('*').eq('student_id', studentId).maybeSingle()
    ]);

    // Log any errors (but don't fail the request)
    if (academicError) console.error('Error fetching academic:', academicError);
    if (experienceError) console.error('Error fetching experience:', experienceError);
    if (projectsError) console.error('Error fetching projects:', projectsError);
    if (skillsError) console.error('Error fetching skills:', skillsError);
    if (languagesError) console.error('Error fetching languages:', languagesError);
    if (certificationsError) console.error('Error fetching certifications:', certificationsError);
    if (socialLinksError) console.error('Error fetching social_links:', socialLinksError);

    return NextResponse.json({
      student: studentData,
      academic: academic || [],
      experience: experience || [],
      projects: projects || [],
      skills: skills || [],
      languages: languages || [],
      certifications: certifications || [],
      socialLinks: socialLinks || null
    });

  } catch (error) {
    console.error('Error fetching published profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
