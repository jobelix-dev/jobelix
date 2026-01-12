# Feedback System Setup Guide

## Overview
The feedback system allows users to submit bug reports and feature requests directly from the app. Feedback is stored in the database and optionally sent via email using Resend.

## Features
✅ Two feedback types: Bug Reports and Feature Requests
✅ Database storage with RLS policies
✅ Optional email notifications via Resend
✅ Works for both authenticated and anonymous users
✅ Rate limiting and validation
✅ Clean modal UI with form validation

## Database Setup

The `user_feedback` table stores all submissions:
- `id`: UUID primary key
- `user_id`: References auth.users (nullable for anonymous)
- `feedback_type`: 'bug' or 'feature'
- `subject`: Short title (max 200 chars)
- `description`: Detailed description (max 5000 chars)
- `user_email`: Fetched automatically if logged in
- `user_agent`: Browser info
- `page_url`: Page where feedback was submitted
- `status`: 'new', 'reviewing', 'resolved', 'wont_fix'
- `created_at`, `updated_at`: Timestamps

## Email Setup (Optional)

### 1. Get Resend API Key
1. Sign up at https://resend.com
2. Go to API Keys section
3. Create a new API key
4. Copy the key (starts with `re_`)

### 2. Add Environment Variables

Add to `.env.local` (local) and Vercel (production):

```env
# Resend API Key
RESEND_API_KEY=re_YOUR_API_KEY_HERE

# Email address to receive feedback
FEEDBACK_EMAIL=your-email@example.com
```

### 3. Verify Domain in Resend

For production emails from a custom domain:
1. Go to Resend Dashboard → Domains
2. Add your domain (e.g., `jobelix.com`)
3. Add DNS records they provide
4. Update the `from` field in `/app/api/feedback/route.ts`:
   ```typescript
   from: 'Jobelix Feedback <noreply@jobelix.com>'
   ```

For testing, you can use Resend's test domain:
```typescript
from: 'onboarding@resend.dev'
to: 'delivered@resend.dev'  // Test inbox
```

## Usage

### User Flow
1. Click "Feedback" button in header (next to "Privacy")
2. Select feedback type (Bug or Feature)
3. Fill in subject and description
4. Click "Submit Feedback"
5. Feedback saved to database + email sent

### For Developers

**View feedback in database:**
```sql
SELECT 
  feedback_type,
  subject,
  description,
  user_email,
  status,
  created_at
FROM user_feedback
ORDER BY created_at DESC;
```

**Update feedback status:**
```sql
UPDATE user_feedback
SET status = 'resolved'
WHERE id = 'feedback-uuid-here';
```

## Security Features

✅ **Rate Limiting**: Built into API route (can add IP-based)
✅ **Input Validation**: Max lengths, required fields
✅ **RLS Policies**: Users can only view their own feedback
✅ **Service Role**: Email sending bypasses RLS securely
✅ **XSS Protection**: React auto-escapes input
✅ **Anonymous Support**: Works without login (optional user_id)

## Customization

### Change Max Lengths
Edit `/app/api/feedback/route.ts`:
```typescript
if (subject.length > 200) { ... }  // Change 200
if (description.length > 5000) { ... }  // Change 5000
```

### Add More Feedback Types
1. Update database constraint:
```sql
ALTER TABLE user_feedback
DROP CONSTRAINT user_feedback_feedback_type_check,
ADD CONSTRAINT user_feedback_feedback_type_check 
CHECK (feedback_type IN ('bug', 'feature', 'question', 'other'));
```

2. Update component with new options

### Email Template Customization
Edit the HTML in `/app/api/feedback/route.ts`:
```typescript
html: `
  <h2>${emailType}</h2>
  <!-- Your custom template here -->
`
```

## Monitoring

**Check recent feedback:**
```sql
SELECT COUNT(*), feedback_type, status
FROM user_feedback
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY feedback_type, status;
```

**Most active users:**
```sql
SELECT user_email, COUNT(*) as feedback_count
FROM user_feedback
WHERE user_email IS NOT NULL
GROUP BY user_email
ORDER BY feedback_count DESC
LIMIT 10;
```

## Troubleshooting

**Emails not sending:**
1. Check `RESEND_API_KEY` is set correctly
2. Verify domain is verified in Resend
3. Check Resend dashboard for error logs
4. Feedback still saves to database even if email fails

**"Service role key not found" error:**
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is in environment variables
- This key is needed to bypass RLS for anonymous submissions

**Modal not opening:**
- Check browser console for errors
- Ensure `FeedbackModal` is imported correctly
- Try clearing browser cache

## Cost Estimation

**Database:**
- Minimal storage (~500 bytes per feedback)
- 1000 feedbacks ≈ 0.5 MB

**Resend:**
- Free tier: 100 emails/day
- Pro: $20/month for 50,000 emails
- Each feedback = 1 email

## Future Enhancements

- [ ] Admin dashboard to view/manage feedback
- [ ] Email threading (group related feedback)
- [ ] Upvote system for feature requests
- [ ] Screenshot upload support
- [ ] Auto-reply to user when status changes
- [ ] Integration with GitHub Issues
- [ ] Search and filter in admin panel
