import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ profile: null })
    }

    // Check if they're a student
    const { data: studentData } = await supabase
      .from('student')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (studentData) {
      return NextResponse.json({
        profile: {
          id: studentData.id,
          role: 'student' as const,
          created_at: studentData.created_at,
        },
      })
    }

    // Check if they're a company
    const { data: companyData } = await supabase
      .from('company')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (companyData) {
      return NextResponse.json({
        profile: {
          id: companyData.id,
          role: 'company' as const,
          created_at: companyData.created_at,
        },
      })
    }

    // No profile found
    return NextResponse.json({ profile: null })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}
