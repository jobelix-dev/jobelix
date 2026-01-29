/**
 * Newsletter subscription endpoint
 * Accepts email and sends welcome email via Resend
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const newsletterSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = newsletterSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Send welcome email via Resend
    if (resend) {
      try {
        await resend.emails.send({
          from: 'Jobelix <newsletter@jobelix.fr>',
          to: email,
          subject: 'Welcome to Jobelix Updates!',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #2C3E35; max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                h1 { color: #2D8659; }
                .button { display: inline-block; padding: 12px 24px; background: #2D8659; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; }
                .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #D4EDDA; font-size: 14px; color: #5F7A6A; }
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
                <p>You can unsubscribe at any time by clicking the link in our emails.</p>
                <p>&copy; 2026 Jobelix. All rights reserved.</p>
              </div>
            </body>
            </html>
          `,
        });
        console.log('Newsletter welcome email sent to:', email);
      } catch (emailError) {
        console.error('Newsletter email error:', emailError);
        // Don't fail the request if email fails
      }
    } else {
      console.warn('RESEND_API_KEY not set - newsletter email not sent');
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
