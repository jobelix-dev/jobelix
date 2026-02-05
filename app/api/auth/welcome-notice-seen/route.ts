/**
 * Welcome Notice Dismissal API Route
 * 
 * Updates the has_seen_welcome_notice flag when user dismisses the welcome notice
 * Route: POST /api/auth/welcome-notice-seen
 */

import "server-only";

import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';

export async function POST() {
  try {
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;

    const { user, supabase } = auth;

    // Check if user is a student
    const { data: studentData } = await supabase
      .from('student')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (studentData) {
      // Update student table
      const { error: updateError } = await supabase
        .from('student')
        .update({ has_seen_welcome_notice: true })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating student welcome notice:', updateError);
        return NextResponse.json(
          { error: 'Failed to update welcome notice status' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Check if user is a company
    const { data: companyData } = await supabase
      .from('company')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (companyData) {
      // Update company table
      const { error: updateError } = await supabase
        .from('company')
        .update({ has_seen_welcome_notice: true })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating company welcome notice:', updateError);
        return NextResponse.json(
          { error: 'Failed to update welcome notice status' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // User not found in either table
    return NextResponse.json(
      { error: 'User profile not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Welcome notice dismissal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
