/**
 * Newsletter subscription endpoint
 * 
 * - Adds subscriber to Resend Contacts for list management
 * - Sends welcome email via Resend
 * 
 * View/manage subscribers at: https://resend.com/contacts
 * Send broadcasts at: https://resend.com/broadcasts
 * 
 * Environment variables required:
 * - RESEND_API_KEY: Your Resend API key
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';
import { generateUnsubscribeUrl } from './unsubscribe/route';
import { checkRateLimit, logApiCall, rateLimitExceededResponse } from '@/lib/server/rateLimiting';
import { getClientIp, hashToPseudoUuid } from '@/lib/server/requestSecurity';
import { API_RATE_LIMIT_POLICIES } from '@/lib/shared/rateLimitPolicies';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const newsletterSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimitConfig = API_RATE_LIMIT_POLICIES.newsletterSubscribe;

    const identity = await hashToPseudoUuid('newsletter-subscribe', getClientIp(request));
    const rateLimitResult = await checkRateLimit(identity, rateLimitConfig);
    if (rateLimitResult.error) return rateLimitResult.error;
    if (!rateLimitResult.data.allowed) {
      return rateLimitExceededResponse(rateLimitConfig, rateLimitResult.data);
    }

    // Count all accepted attempts (including validation failures) to deter abuse.
    await logApiCall(identity, rateLimitConfig.endpoint);

    const body = await request.json();
    const validation = newsletterSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    if (!resend) {
      console.warn('RESEND_API_KEY not set - newsletter subscription skipped');
      return NextResponse.json({
        success: true,
        message: 'Successfully subscribed!',
      });
    }

    let unsubscribeUrl: string;
    try {
      unsubscribeUrl = generateUnsubscribeUrl(email);
    } catch {
      return NextResponse.json(
        { error: 'Newsletter is temporarily unavailable' },
        { status: 503 }
      );
    }

    // 1. Add subscriber to Resend Contacts
    try {
      await resend.contacts.create({
        email,
        unsubscribed: false,
      });
      console.log('Newsletter subscriber added');
    } catch (contactError: unknown) {
      // Handle duplicate subscriber gracefully
      const errorMessage = contactError instanceof Error ? contactError.message : String(contactError);
      if (errorMessage.includes('already exists')) {
        console.log('Newsletter subscriber already exists');
      } else {
        console.error('Failed to add subscriber:', contactError);
        // Continue anyway - still send welcome email
      }
    }

    // 2. Send welcome email with List-Unsubscribe header
    try {
      await resend.emails.send({
        from: 'Jobelix <newsletter@jobelix.fr>',
        to: email,
        subject: 'Welcome to Jobelix Updates!',
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #2C3E35; max-width: 600px; margin: 0 auto; padding: 40px 20px; }
              h1 { color: #2D8659; }
              .button { display: inline-block; padding: 12px 24px; background: #2D8659; color: #ffffff !important; text-decoration: none; border-radius: 8px; margin-top: 20px; }
              .button:hover, .button:visited, .button:active { color: #ffffff !important; }
              .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #D4EDDA; font-size: 14px; color: #5F7A6A; }
              .footer a { color: #5F7A6A; }
            </style>
          </head>
          <body>
            <h1>Welcome to Jobelix!</h1>
            <p>Thanks for subscribing to our newsletter. You'll receive:</p>
            <ul>
              <li>New feature announcements</li>
              <li>Job search tips and career advice</li>
              <li>Product updates and improvements</li>
            </ul>
            <a href="https://www.jobelix.fr/download" class="button">Download Jobelix</a>
            <div class="footer">
              <p>You can <a href="${unsubscribeUrl}">unsubscribe</a> at any time.</p>
              <p>&copy; 2026 Jobelix. All rights reserved.</p>
            </div>
          </body>
          </html>
        `,
      });
      console.log('Newsletter welcome email sent');
    } catch (emailError) {
      console.error('Newsletter email error:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed!',
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}
