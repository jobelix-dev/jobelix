/**
 * Feedback submission endpoint
 * Accepts bug reports and feature requests, stores in DB and sends email via Resend
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server/supabaseServer';
import { getServiceSupabase } from '@/lib/server/supabaseService';
import { validateRequest, feedbackSchema } from '@/lib/server/validation';
import { checkRateLimit, logApiCall, rateLimitExceededResponse } from '@/lib/server/rateLimiting';
import { getClientIp, hashToPseudoUuid } from '@/lib/server/requestSecurity';
import { Resend } from 'resend';
import { generateFeedbackEmail, getFeedbackEmailSubject } from '@/lib/server/emailTemplates';
import { API_RATE_LIMIT_POLICIES } from '@/lib/shared/rateLimitPolicies';

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY not set - feedback emails will not be sent');
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FEEDBACK_EMAIL = process.env.FEEDBACK_EMAIL || 'report@jobelix.com';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user (optional - allow anonymous feedback)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const rateLimitConfig = API_RATE_LIMIT_POLICIES.feedbackSubmit;

    const identity = user?.id
      ? user.id
      : await hashToPseudoUuid('feedback-submit', getClientIp(request));

    const rateLimitResult = await checkRateLimit(identity, rateLimitConfig);
    if (rateLimitResult.error) return rateLimitResult.error;
    if (!rateLimitResult.data.allowed) {
      return rateLimitExceededResponse(rateLimitConfig, rateLimitResult.data);
    }

    // Count all accepted attempts (including validation failures) to deter abuse.
    await logApiCall(identity, rateLimitConfig.endpoint);

    // Parse and validate request body
    const body = await request.json();
    
    // Get user info for validation
    const userAgent = request.headers.get('user-agent') || undefined;
    const referer = request.headers.get('referer') || undefined;
    
    // Add context to body for validation
    const validationBody = {
      ...body,
      user_agent: userAgent,
      page_url: referer,
    };
    
    const validation = validateRequest(validationBody, feedbackSchema);
    
    if (validation.error) {
      return NextResponse.json(validation.error, { status: validation.error.status });
    }

    const { feedback_type, subject, description, user_email } = validation.data;

    // Fetch user email if authenticated and not provided
    let finalUserEmail = user_email;
    if (user && !finalUserEmail) {
      const serviceClient = getServiceSupabase();
      const { data: userData } = await serviceClient
        .from('student')
        .select('mail_adress')
        .eq('id', user.id)
        .maybeSingle();
      
      if (!userData) {
        const { data: companyData } = await serviceClient
          .from('company')
          .select('mail_adress')
          .eq('id', user.id)
          .maybeSingle();
        finalUserEmail = companyData?.mail_adress;
      } else {
        finalUserEmail = userData?.mail_adress;
      }
    }

    // Store feedback in database (use service role to bypass RLS for anonymous)
    const serviceClient = getServiceSupabase();
    const { data: feedback, error: dbError } = await serviceClient
      .from('user_feedback')
      .insert({
        user_id: user?.id || null,
        feedback_type,
        subject,
        description,
        user_email: finalUserEmail,
        user_agent: userAgent,
        page_url: referer,
        status: 'new',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to store feedback' },
        { status: 500 }
      );
    }

    // Send email via Resend
    if (resend) {
      try {
        await resend.emails.send({
          from: 'Acme <report@jobelix.fr>',
          to: FEEDBACK_EMAIL,
          subject: getFeedbackEmailSubject(feedback_type, subject),
          html: generateFeedbackEmail({
            type: feedback_type,
            subject,
            description,
            userEmail: finalUserEmail || null,
            userId: user?.id || null,
            feedbackId: feedback.id,
            createdAt: feedback.created_at,
            pageUrl: referer || '',
            userAgent: userAgent || '',
          }),
        });
        console.log('✓ Feedback email sent successfully to', FEEDBACK_EMAIL);
      } catch (emailError: unknown) {
        // Log but don't fail - feedback is stored in DB
        console.error('✗ Email send error:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback!',
      feedbackId: feedback.id,
    });

  } catch (error: unknown) {
    console.error('Feedback submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
