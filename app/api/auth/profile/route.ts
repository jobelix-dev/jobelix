/**
 * PROFILE API ROUTE (server-side)
 *
 * URL: GET /api/auth/profile
 *
 * What it does:
 * - Checks who is currently logged in (using cookies)
 * - Looks in the database to see if this user is a "student" or a "company"
 * - Returns a small object: { id, role, created_at }
 *
 * Why this exists:
 * - Your frontend needs to know which dashboard to show (student vs company).
 *
 * Beginner note:
 * - This code runs on the SERVER (not in the browser).
 * - The browser calls this endpoint, but the server does the secure checks.
 */

import "server-only";

import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/server/auth'

export async function GET() {
  try {
    /**
     * Authenticate using cached helper - reduces duplicate auth.getUser() calls
     */
    const auth = await authenticateRequest()
    
    // If not authenticated, return null profile (not an error - just not logged in)
    if (auth.error) {
      return NextResponse.json({ profile: null })
    }

    const { user, supabase } = auth

    /**
     * Now we look in the "student" table to see if this user has a student profile.
     *
     * We search for a row where `id = user.id`.
     * (In your DB design, the student's primary key is the same as the auth user id.)
     */    
    const { data: studentData } = await supabase
      .from('student')
      .select('id, created_at, has_seen_welcome_notice')
      .eq('id', user.id)
      .maybeSingle()

    /**
     * If a student row exists, we say the user is a student.
     */
    if (studentData) {
      return NextResponse.json({
        profile: {
          id: studentData.id,
          email: user.email ?? '',
          role: 'student' as const,
          created_at: studentData.created_at,
          has_seen_welcome_notice: studentData.has_seen_welcome_notice ?? false,
        },
      })
    }

    /**
     * If the user is not a student, we check the "company" table.
     * Same logic: a company row exists if `id = user.id`.
     */
    const { data: companyData } = await supabase
      .from('company')
      .select('id, created_at, has_seen_welcome_notice')
      .eq('id', user.id)
      .maybeSingle()

    /**
     * If a company row exists, we say the user is a company.
     */
    if (companyData) {
      return NextResponse.json({
        profile: {
          id: companyData.id,
          email: user.email ?? '',
          role: 'company' as const,
          created_at: companyData.created_at,
          has_seen_welcome_notice: companyData.has_seen_welcome_notice ?? false,
        },
      })
    }

    /**
     * Logged in, but no student row and no company row.
     * This can happen if onboarding is not finished yet.
     */
    return NextResponse.json({ profile: null })
  } catch (error: unknown) {
    /**
     * IMPORTANT SECURITY NOTE:
     * - Don't return raw error.message to the client in production.
     *   It can reveal internal table names, RLS details, etc.
     * - Log the real error on the server, return a generic message to the client.
     */
    console.error('GET /api/auth/profile failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}
