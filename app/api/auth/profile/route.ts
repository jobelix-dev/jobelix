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
import { createClient } from '@/lib/server/supabaseServer'

export async function GET() {
  try {
    console.log('[Profile API] Starting profile fetch')
    
    /**
     * Create a Supabase client for SERVER use.
     * This client reads the user's login cookies automatically.
     * (So we can know who is logged in.)
     */
    const supabase = await createClient()

    /**
     * SECURITY: Identify the user by asking Supabase Auth.
     * We do NOT trust the frontend to tell us the user id.
     *
     * If the user is logged in, `user` contains their id (UUID).
     */    
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('[Profile API] Auth check result:', {
      userId: user?.id,
      authError: authError?.message,
      hasUser: !!user
    })
    
    /**
     * If there is no logged-in user, we return profile: null.
     * The frontend can then redirect to login.
     */
    if (authError || !user) {
      console.log('[Profile API] No authenticated user, returning null profile')
      return NextResponse.json({ profile: null })
    }

    /**
     * Now we look in the "student" table to see if this user has a student profile.
     *
     * We search for a row where `id = user.id`.
     * (In your DB design, the student's primary key is the same as the auth user id.)
     */    
    const { data: studentData, error: studentError } = await supabase
      .from('student')
      .select('id, created_at')
      .eq('id', user.id)
      .maybeSingle()

    console.log('[Profile API] Student query result:', {
      studentData: studentData ? { id: studentData.id, created_at: studentData.created_at } : null,
      studentError: studentError?.message
    })

    /**
     * If a student row exists, we say the user is a student.
     */
    if (studentData) {
      console.log('[Profile API] Found student profile, returning student role')
      return NextResponse.json({
        profile: {
          id: studentData.id,
          role: 'student' as const,
          created_at: studentData.created_at,
        },
      })
    }

    /**
     * If the user is not a student, we check the "company" table.
     * Same logic: a company row exists if `id = user.id`.
     */
    const { data: companyData, error: companyError } = await supabase
      .from('company')
      .select('id, created_at')
      .eq('id', user.id)
      .maybeSingle()

    console.log('[Profile API] Company query result:', {
      companyData: companyData ? { id: companyData.id, created_at: companyData.created_at } : null,
      companyError: companyError?.message
    })

    /**
     * If a company row exists, we say the user is a company.
     */
    if (companyData) {
      console.log('[Profile API] Found company profile, returning company role')
      return NextResponse.json({
        profile: {
          id: companyData.id,
          role: 'company' as const,
          created_at: companyData.created_at,
        },
      })
    }

    /**
     * Logged in, but no student row and no company row.
     * This can happen if onboarding is not finished yet.
     */
    console.log('[Profile API] No profile found in student or company tables, returning null profile')
    return NextResponse.json({ profile: null })
  } catch (error: any) {
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
