/**
 * DELETE ACCOUNT API ROUTE
 *
 * Permanently deletes a user's account and all associated data.
 * This is a GDPR-compliant "right to erasure" implementation.
 *
 * DELETE /api/auth/account
 *
 * What gets deleted (via CASCADE):
 * - auth.users record (triggers cascade to all tables)
 * - student/company profile
 * - All profile data (academic, experience, skills, etc.)
 * - API tokens and call logs
 * - Credits and purchase history
 * - Resume files from storage
 *
 * Note: user_feedback is SET NULL (preserves anonymized feedback)
 */

import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseServer";
import { getServiceSupabase } from "@/lib/server/supabaseService";

export async function DELETE() {
  try {
    // 1. Get authenticated user from session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = user.id;

    // 2. Use service role client for admin operations
    const serviceSupabase = getServiceSupabase();

    // 3. Delete files from storage (resumes bucket)
    // Files are stored as: resumes/{userId}/{filename}
    try {
      const { data: files } = await serviceSupabase.storage
        .from("resumes")
        .list(userId);

      if (files && files.length > 0) {
        const filePaths = files.map((file) => `${userId}/${file.name}`);
        const { error: storageError } = await serviceSupabase.storage
          .from("resumes")
          .remove(filePaths);

        if (storageError) {
          console.error("Failed to delete resume files:", storageError);
          // Continue with account deletion even if storage cleanup fails
          // The files will become orphaned but user data is more important to delete
        }
      }
    } catch (storageErr) {
      console.error("Storage cleanup error:", storageErr);
      // Continue with account deletion
    }

    // 4. Delete user from auth.users
    // This triggers CASCADE deletes on all related tables:
    // - student/company
    // - academic, experience, project, skill, language, publication, certification, social_link
    // - student_profile_draft, resume
    // - api_tokens, api_call_log
    // - user_credits, daily_credit_grants, credit_purchases
    // Note: user_feedback is SET NULL (preserves anonymized feedback)
    const { error: deleteError } = await serviceSupabase.auth.admin.deleteUser(
      userId
    );

    if (deleteError) {
      console.error("Failed to delete user:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete account" },
        { status: 500 }
      );
    }

    // 5. Return success
    // The session is automatically invalidated when the user is deleted
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
