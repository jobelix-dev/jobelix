/**
 * Email Templates
 * Reusable email HTML templates for various notifications
 */

import "server-only";

export interface FeedbackEmailData {
  type: 'bug' | 'feature'
  subject: string
  description: string
  userEmail: string | null
  userId: string | null
  feedbackId: string
  createdAt: string
  pageUrl: string
  userAgent: string
}

/**
 * Generate HTML email for feedback submissions (bug reports and feature requests)
 */
export function generateFeedbackEmail(data: FeedbackEmailData): string {
  const emailType = data.type === 'bug' ? '🐛 Bug Report' : '💡 Feature Request'
  const fromUser = data.userEmail || 'Anonymous User'
  const userId = data.userId || 'Not logged in'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${emailType}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        h2 {
          color: ${data.type === 'bug' ? '#dc2626' : '#2563eb'};
          border-bottom: 2px solid ${data.type === 'bug' ? '#dc2626' : '#2563eb'};
          padding-bottom: 10px;
        }
        h3 {
          color: #4b5563;
          margin-top: 20px;
        }
        .info-row {
          background: #f9fafb;
          padding: 10px 15px;
          border-radius: 6px;
          margin: 10px 0;
        }
        .info-row strong {
          color: #1f2937;
          display: inline-block;
          min-width: 100px;
        }
        .description {
          background: #f9fafb;
          padding: 15px;
          border-radius: 6px;
          white-space: pre-wrap;
          word-wrap: break-word;
          border-left: 4px solid ${data.type === 'bug' ? '#dc2626' : '#2563eb'};
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #6b7280;
        }
        hr {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <h2>${emailType}</h2>
      
      <div class="info-row">
        <strong>From:</strong> ${fromUser}
      </div>
      <div class="info-row">
        <strong>User ID:</strong> ${userId}
      </div>
      <div class="info-row">
        <strong>Page:</strong> ${data.pageUrl}
      </div>
      <div class="info-row">
        <strong>User Agent:</strong> ${data.userAgent}
      </div>
      
      <hr />
      
      <h3>Subject</h3>
      <p>${data.subject}</p>
      
      <h3>Description</h3>
      <div class="description">${data.description}</div>
      
      <div class="footer">
        <p>
          <strong>Feedback ID:</strong> ${data.feedbackId}<br>
          <strong>Submitted:</strong> ${new Date(data.createdAt).toLocaleString()}
        </p>
      </div>
    </body>
    </html>
  `
}

/**
 * Get email subject line for feedback
 */
export function getFeedbackEmailSubject(type: 'bug' | 'feature', subject: string): string {
  const prefix = type === 'bug' ? '🐛 Bug Report' : '💡 Feature Request'
  return `${prefix}: ${subject}`
}
