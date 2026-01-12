/**
 * Feedback submission endpoint
 * Accepts bug reports and feature requests, stores in DB and sends email via Resend
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import serviceSupabase from '@/lib/supabaseService';
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY not set - feedback emails will not be sent');
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FEEDBACK_EMAIL = process.env.FEEDBACK_EMAIL || 'feedback@jobelix.com';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user (optional - allow anonymous feedback)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Parse request body
    const body = await request.json();
    const { type, subject, description } = body;

    // Validate input
    if (!type || !['bug', 'feature'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid feedback type. Must be "bug" or "feature"' },
        { status: 400 }
      );
    }

    if (!subject || subject.trim().length === 0) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      );
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    if (subject.length > 200) {
      return NextResponse.json(
        { error: 'Subject must be 200 characters or less' },
        { status: 400 }
      );
    }

    if (description.length > 5000) {
      return NextResponse.json(
        { error: 'Description must be 5000 characters or less' },
        { status: 400 }
      );
    }

    // Get user info for context
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const referer = request.headers.get('referer') || 'Unknown';

    // Fetch user email if authenticated
    let userEmail = null;
    if (user) {
      const serviceClient = serviceSupabase();
      const { data: userData } = await serviceClient
        .from('student')
        .select('email')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!userData) {
        const { data: companyData } = await serviceClient
          .from('company')
          .select('email')
          .eq('user_id', user.id)
          .maybeSingle();
        userEmail = companyData?.email;
      } else {
        userEmail = userData?.email;
      }
    }

    // Store feedback in database (use service role to bypass RLS for anonymous)
    const serviceClient = serviceSupabase();
    const { data: feedback, error: dbError } = await serviceClient
      .from('user_feedback')
      .insert({
        user_id: user?.id || null,
        feedback_type: type,
        subject: subject.trim(),
        description: description.trim(),
        user_email: userEmail,
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
        const emailType = type === 'bug' ? '🐛 Bug Report' : '💡 Feature Request';
        const fromUser = userEmail || 'Anonymous User';
        const userId = user?.id || 'Not logged in';

        await resend.emails.send({
          from: 'Acme <report@jobelix.fr>',  // Use Resend's test domain for development
          to: FEEDBACK_EMAIL,
          subject: `${emailType}: ${subject}`,
          html: `
            <h2>${emailType}</h2>
            <p><strong>From:</strong> ${fromUser}</p>
            <p><strong>User ID:</strong> ${userId}</p>
            <p><strong>Page:</strong> ${referer}</p>
            <p><strong>User Agent:</strong> ${userAgent}</p>
            <hr />
            <h3>Subject</h3>
            <p>${subject}</p>
            <h3>Description</h3>
            <p style="white-space: pre-wrap;">${description}</p>
            <hr />
            <p><small>Feedback ID: ${feedback.id}</small></p>
            <p><small>Submitted: ${new Date(feedback.created_at).toLocaleString()}</small></p>
          `,
        });
        console.log('✓ Feedback email sent successfully to', FEEDBACK_EMAIL);
      } catch (emailError: any) {
        // Log but don't fail - feedback is stored in DB
        console.error('✗ Email send error:', emailError.message || emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback!',
      feedbackId: feedback.id,
    });

  } catch (error: any) {
    console.error('Feedback submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
