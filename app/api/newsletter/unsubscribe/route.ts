/**
 * Newsletter unsubscribe endpoint
 * 
 * Handles both:
 * - GET: Shows unsubscribe confirmation page
 * - POST: One-click unsubscribe (for List-Unsubscribe-Post header support)
 * 
 * Updates the contact's unsubscribed status in Resend.
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function unsubscribeContact(email: string): Promise<boolean> {
  if (!resend || !email) return false;
  
  try {
    // Find the contact by email
    const { data: contacts } = await resend.contacts.list();
    const contact = contacts?.data?.find(c => c.email === email);
    
    if (contact) {
      // Update contact to unsubscribed
      await resend.contacts.update({
        id: contact.id,
        unsubscribed: true,
      });
      console.log('Contact unsubscribed:', email);
      return true;
    } else {
      console.log('Contact not found for unsubscribe:', email);
      return false;
    }
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return false;
  }
}

// GET: Show unsubscribe confirmation page
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  
  if (!email) {
    return new NextResponse('Missing email parameter', { status: 400 });
  }

  const success = await unsubscribeContact(email);
  
  // Return a simple HTML page
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Unsubscribed - Jobelix</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #2C3E35;
          max-width: 500px;
          margin: 0 auto;
          padding: 60px 20px;
          text-align: center;
        }
        h1 { color: #2D8659; margin-bottom: 16px; }
        p { color: #5F7A6A; margin-bottom: 24px; }
        a {
          display: inline-block;
          padding: 12px 24px;
          background: #2D8659;
          color: white;
          text-decoration: none;
          border-radius: 8px;
        }
        a:hover { background: #246B48; }
      </style>
    </head>
    <body>
      <h1>${success ? 'Unsubscribed' : 'Something went wrong'}</h1>
      <p>${success 
        ? "You've been unsubscribed from Jobelix newsletter emails. We're sorry to see you go!"
        : "We couldn't process your unsubscribe request. Please try again or contact support."
      }</p>
      <a href="https://www.jobelix.fr">Back to Jobelix</a>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

// POST: One-click unsubscribe (for email client support)
export async function POST(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  
  if (!email) {
    return new NextResponse('Missing email parameter', { status: 400 });
  }

  await unsubscribeContact(email);
  
  // Return 200 OK with empty body (as per RFC 8058)
  return new NextResponse(null, { status: 200 });
}
