# Database Security Policies - Comprehensive RLS Guide

This document outlines the **recommended Row Level Security (RLS) policies** for all tables in the Jobelix Supabase database. These policies ensure proper data isolation, prevent unauthorized access, and maintain security best practices.

---

## Table of Contents
1. [Core User Tables](#core-user-tables)
2. [Profile & Resume Tables](#profile--resume-tables)
3. [Company & Offer Tables](#company--offer-tables)
4. [Application System](#application-system)
5. [Credits System](#credits-system)
6. [Authentication & API Access](#authentication--api-access)
7. [Feedback & Tracking](#feedback--tracking)
8. [Supporting Tables](#supporting-tables)

---

## Core User Tables

### `auth.users`
**Managed by Supabase Auth** - No custom RLS needed. Built-in policies ensure users can only access their own auth data.

---

### `student`
**Purpose**: Store student profile information linked to auth.users  
**Foreign Keys**: `id` → `auth.users(id)`

**Recommended RLS Policies**:

| Operation | Policy | Reason |
|-----------|--------|--------|
| **SELECT** | `auth.uid() = id` | Students can only view their own profile |
| **INSERT** | `auth.uid() = id AND NOT EXISTS (SELECT 1 FROM student WHERE id = auth.uid())` | Prevent duplicate student records; only during signup |
| **UPDATE** | `auth.uid() = id` | Students can only update their own profile |
| **DELETE** | `false` | Prevent manual deletion; handled by CASCADE on auth.users deletion |

**Security Notes**:
- The `mail_adress` field should match `auth.users.email` (enforced by trigger)
- INSERT policy ensures one student record per user
- DELETE disabled because deletion should happen via auth.users CASCADE

---

### `company`
**Purpose**: Store company profile information  
**Foreign Keys**: `id` → `auth.users(id)`

**Recommended RLS Policies**:

| Operation | Policy | Reason |
|-----------|--------|--------|
| **SELECT** | `auth.uid() = id OR EXISTS (SELECT 1 FROM company_offer WHERE company_id = company.id)` | Companies see own profile; students see companies with published offers |
| **INSERT** | `auth.uid() = id AND NOT EXISTS (SELECT 1 FROM company WHERE id = auth.uid())` | One company record per user |
| **UPDATE** | `auth.uid() = id` | Companies can only update their own profile |
| **DELETE** | `false` | Prevent manual deletion |

**Security Notes**:
- Students should see company profiles when browsing offers (hence the SELECT policy allows viewing companies with published offers)
- Company data should be minimal when viewed by students (name, description only - not internal fields)

---

## Profile & Resume Tables

### `academic`
**Purpose**: Student academic history (education)  
**Foreign Keys**: `student_id` → `student(id)`

**Recommended RLS Policies**:

| Operation | Policy | Reason |
|-----------|--------|--------|
| **SELECT** | `student_id = auth.uid()` | Students can only view their own education |
| **INSERT** | `student_id = auth.uid()` | Students can only add their own education |
| **UPDATE** | `student_id = auth.uid()` | Students can only update their own education |
| **DELETE** | `student_id = auth.uid()` | Students can delete their own education entries |

**Security Notes**:
- No public access needed - education data is private
- Used for resume building and profile completeness

---

### `experience`
**Purpose**: Student work experience history  
**Foreign Keys**: `student_id` → `student(id)`

**Recommended RLS Policies**:

| Operation | Policy | Reason |
|-----------|--------|--------|
| **SELECT** | `student_id = auth.uid()` | Students can only view their own experience |
| **INSERT** | `student_id = auth.uid()` | Students can only add their own experience |
| **UPDATE** | `student_id = auth.uid()` | Students can only update their own experience |
| **DELETE** | `student_id = auth.uid()` | Students can delete their own experience |

**Security Notes**:
- Similar to academic table
- Could be shared with companies during application review (handled via application system, not direct RLS)

---

### `resume`
**Purpose**: Track uploaded resume files in Supabase Storage  
**Foreign Keys**: `student_id` → `student(id)`

**Recommended RLS Policies**:

| Operation | Policy | Reason |
|-----------|--------|--------|
| **SELECT** | `student_id = auth.uid()` | Students can only see their own resume records |
| **INSERT** | `student_id = auth.uid()` | Students can only upload their own resumes |
| **UPDATE** | `false` | Resumes should not be updated; upload new version instead |
| **DELETE** | `student_id = auth.uid()` | Students can delete their own resumes |

**Security Notes**:
- Actual file access controlled by Storage bucket policies
- This table only tracks metadata (filename, upload date)
- **Storage Bucket Policy**: `resumes` bucket should allow:
  - `INSERT`: User can upload to `{user_id}/*`
  - `SELECT`: User can read from `{user_id}/*`
  - `DELETE`: User can delete from `{user_id}/*`

---

### `student_profile_draft`
**Purpose**: Temporary storage for profile data during onboarding/editing  
**Foreign Keys**: `student_id` → `student(id)`

**Recommended RLS Policies**:

| Operation | Policy | Reason |
|-----------|--------|--------|
| **SELECT** | `student_id = auth.uid()` | Students can only view their own draft |
| **INSERT** | `student_id = auth.uid() AND NOT EXISTS (SELECT 1 FROM student_profile_draft WHERE student_id = auth.uid())` | One draft per student |
| **UPDATE** | `student_id = auth.uid()` | Students can update their own draft |
| **DELETE** | `student_id = auth.uid()` | Students can delete their draft |

**Security Notes**:
- Draft data is never public
- Used during profile creation wizard
- Can be safely deleted after profile completion

---

### `student_work_preferences`
**Purpose**: Job search preferences and auto-apply bot configuration  
**Foreign Keys**: `student_id` → `student(id)`

**Recommended RLS Policies**:

| Operation | Policy | Reason |
|-----------|--------|--------|
| **SELECT** | `student_id = auth.uid()` | Students can only view their own preferences |
| **INSERT** | `student_id = auth.uid() AND NOT EXISTS (SELECT 1 FROM student_work_preferences WHERE student_id = auth.uid())` | One preference record per student |
| **UPDATE** | `student_id = auth.uid()` | Students can update their own preferences |
| **DELETE** | `student_id = auth.uid()` | Students can delete preferences (bot stops) |

**Security Notes**:
- Contains sensitive bot configuration (blacklists, auto-apply settings)
- Never expose to companies or other students
- Critical for auto-apply feature security

---

## Company & Offer Tables

### `company_offer`
**Purpose**: Published job offers from companies  
**Foreign Keys**: `company_id` → `company(id)`

**Recommended RLS Policies**:

| Operation | Policy | Reason |
|-----------|--------|--------|
| **SELECT** | `true` | All authenticated users can browse offers |
| **INSERT** | `company_id = auth.uid()` | Companies can only create their own offers |
| **UPDATE** | `company_id = auth.uid()` | Companies can only update their own offers |
| **DELETE** | `company_id = auth.uid()` | Companies can delete their own offers |

**Security Notes**:
- Public SELECT allows students to browse job board
- Could add filter for "published" status if offers have draft mode
- Consider adding soft delete (archive) instead of hard delete

---

### `company_offer_draft`
**Purpose**: Unpublished/draft job offers  
**Foreign Keys**: `company_id` → `company(id)`

**Recommended RLS Policies**:

| Operation | Policy | Reason |
|-----------|--------|--------|
| **SELECT** | `company_id = auth.uid()` | Companies can only view their own drafts |
| **INSERT** | `company_id = auth.uid()` | Companies can create draft offers |
| **UPDATE** | `company_id = auth.uid()` | Companies can edit their drafts |
| **DELETE** | `company_id = auth.uid()` | Companies can delete drafts |

**Security Notes**:
- **NEVER** allow students to see drafts
- Draft offers should not appear in job board queries
- Publishing mechanism should copy from draft to `company_offer`

---

### `offer_skills`
**Purpose**: Skills required for a job offer  
**Foreign Keys**: `offer_id` → `company_offer(id)`

**Recommended RLS Policies**:

| Operation | Policy | Reason |
|-----------|--------|--------|
| **SELECT** | `true` | Public - students need to see required skills |
| **INSERT** | `EXISTS (SELECT 1 FROM company_offer WHERE id = offer_id AND company_id = auth.uid())` | Only offer owner can add skills |
| **UPDATE** | `EXISTS (SELECT 1 FROM company_offer WHERE id = offer_id AND company_id = auth.uid())` | Only offer owner can update skills |
| **DELETE** | `EXISTS (SELECT 1 FROM company_offer WHERE id = offer_id AND company_id = auth.uid())` | Only offer owner can remove skills |

**Security Notes**:
- Public SELECT allows skill-based job search
- JOIN with company_offer ensures proper ownership

---

### `offer_locations`
**Purpose**: Locations for a job offer  
**Foreign Keys**: `offer_id` → `company_offer(id)`

**Recommended RLS Policies**:

| Operation | Policy | Reason |
|-----------|--------|--------|
| **SELECT** | `true` | Public - students need to see job locations |
| **INSERT** | `EXISTS (SELECT 1 FROM company_offer WHERE id = offer_id AND company_id = auth.uid())` | Only offer owner can add locations |
| **UPDATE** | `EXISTS (SELECT 1 FROM company_offer WHERE id = offer_id AND company_id = auth.uid())` | Only offer owner can update locations |
| **DELETE** | `EXISTS (SELECT 1 FROM company_offer WHERE id = offer_id AND company_id = auth.uid())` | Only offer owner can remove locations |

**Security Notes**:
- Similar to offer_skills
- Location-based filtering requires public SELECT

---

### `profile_searched`
**Purpose**: Track what kind of profiles companies are looking for  
**Foreign Keys**: `offer_id` → `company_offer(id)`

**Recommended RLS Policies**:

| Operation | Policy | Reason |
|-----------|--------|--------|
| **SELECT** | `EXISTS (SELECT 1 FROM company_offer WHERE id = offer_id AND company_id = auth.uid())` | Only offer owner can see search criteria |
| **INSERT** | `EXISTS (SELECT 1 FROM company_offer WHERE id = offer_id AND company_id = auth.uid())` | Only offer owner can set criteria |
| **UPDATE** | `EXISTS (SELECT 1 FROM company_offer WHERE id = offer_id AND company_id = auth.uid())` | Only offer owner can update criteria |
| **DELETE** | `EXISTS (SELECT 1 FROM company_offer WHERE id = offer_id AND company_id = auth.uid())` | Only offer owner can delete criteria |

**Security Notes**:
- **NOT public** - this is internal company data
- Students should not see what profiles companies are actively searching for
- Used for matching algorithms

---

## Application System

### `application`
**Purpose**: Track student applications to job offers  
**Foreign Keys**: `student_id` → `student(id)`, `offer_id` → `company_offer(id)`

**Recommended RLS Policies**:

| Operation | Policy | Reason |
|-----------|--------|--------|
| **SELECT** | `student_id = auth.uid() OR EXISTS (SELECT 1 FROM company_offer WHERE id = offer_id AND company_id = auth.uid())` | Students see their own applications; companies see applications to their offers |
| **INSERT** | `student_id = auth.uid() AND NOT EXISTS (SELECT 1 FROM application WHERE student_id = auth.uid() AND offer_id = application.offer_id)` | Students can apply; prevent duplicate applications |
| **UPDATE** | `EXISTS (SELECT 1 FROM company_offer WHERE id = offer_id AND company_id = auth.uid())` | Only companies can update application status |
| **DELETE** | `student_id = auth.uid() AND curent_state = 'unseen'` | Students can withdraw applications if not yet reviewed |

**Security Notes**:
- Dual visibility: students see their applications, companies see applications to their offers
- INSERT prevents duplicate applications (consider unique constraint)
- UPDATE restricted to companies (status changes like "interview", "rejected")
- DELETE allows withdrawal before company review

---

## Credits System

### `user_credits`
**Purpose**: Unified credit balance for API usage (auto-apply bot)  
**Foreign Keys**: `user_id` → `auth.users(id)`

**Recommended RLS Policies**:

| Operation | Policy | Reason |
|-----------|--------|--------|
| **SELECT** | `user_id = auth.uid()` | Users can only view their own credit balance |
| **INSERT** | `false` | Credits created via RPC function only (security) |
| **UPDATE** | `false` | Credits updated via RPC function only (security) |
| **DELETE** | `false` | Credits should never be deleted |

**Security Notes**:
- **CRITICAL**: Direct INSERT/UPDATE would allow credit fraud
- All credit operations MUST go through `SECURITY DEFINER` functions:
  - `grant_daily_credits(p_user_id)` - Give daily free credits
  - `use_credits(p_user_id, p_amount)` - Deduct credits for API calls
  - `add_purchased_credits(...)` - Add credits after Stripe payment
- These functions enforce business logic and prevent tampering

---

### `daily_credit_grants`
**Purpose**: Track daily free credit claims (prevent double-claiming)  
**Foreign Keys**: `user_id` → `auth.users(id)`

**Recommended RLS Policies**:

| Operation | Policy | Reason |
|-----------|--------|--------|
| **SELECT** | `user_id = auth.uid()` | Users can see their own claim history |
| **INSERT** | `false` | Grants created via RPC function only |
| **UPDATE** | `false` | Grants are immutable |
| **DELETE** | `false` | Grants should never be deleted |

**Security Notes**:
- Ensures one daily credit claim per user per day
- INSERT handled by `grant_daily_credits()` function
- Unique constraint on `(user_id, granted_date)` enforces idempotency

---

### `credit_purchases`
**Purpose**: Track Stripe purchase history for audit/refunds  
**Foreign Keys**: `user_id` → `auth.users(id)`

**Recommended RLS Policies**:

| Operation | Policy | Reason |
|-----------|--------|--------|
| **SELECT** | `user_id = auth.uid()` | Users can view their purchase history |
| **INSERT** | `false` | Purchases created via Stripe webhook only |
| **UPDATE** | `false` | Purchases updated via webhook/RPC only |
| **DELETE** | `false` | Purchase records are immutable for audit |

**Security Notes**:
- **CRITICAL**: Users must NEVER be able to INSERT fake purchases
- All purchases handled by:
  1. `create-checkout` API creates pending record (service role)
  2. Stripe webhook calls `add_purchased_credits()` to complete
- Status field tracks: `pending` → `completed` / `failed` / `refunded`

---

## Authentication & API Access

### `api_tokens`
**Purpose**: Store API tokens for Python desktop app authentication  
**Foreign Keys**: `user_id` → `auth.users(id)`

**Recommended RLS Policies**:

| Operation | Policy | Reason |
|-----------|--------|--------|
| **SELECT** | `user_id = auth.uid()` | Users can view their own API token |
| **INSERT** | `false` | Tokens auto-generated on signup |
| **UPDATE** | `false` | Tokens are immutable (revoke by deletion) |
| **DELETE** | `user_id = auth.uid()` | Users can revoke their own token |

**Security Notes**:
- One token per user (UNIQUE constraint on user_id)
- Token created by `handle_new_user()` trigger on signup
- Backend validates token via service role (bypasses RLS)
- Tracks `last_used_at` and usage statistics
- Users can regenerate by DELETE + trigger regeneration

---

### `gpt_tokens`
**Purpose**: (DEPRECATED - replaced by unified credits system)  
**Status**: Table dropped in migration `20260110000100_unified_credits_system.sql`

**No RLS needed** - table no longer exists.

---

## Feedback & Tracking

### `user_feedback`
**Purpose**: Store bug reports and feature requests from users  
**Foreign Keys**: `user_id` → `auth.users(id)` (nullable for anonymous)

**Recommended RLS Policies**:

| Operation | Policy | Reason |
|-----------|--------|--------|
| **SELECT** | `user_id = auth.uid()` | Users can view their own feedback |
| **INSERT** | `true` | Allow authenticated AND anonymous feedback |
| **UPDATE** | `false` | Feedback is immutable after submission |
| **DELETE** | `false` | Feedback should not be deleted by users |

**Security Notes**:
- `user_id` can be NULL (anonymous feedback)
- INSERT policy allows both authenticated (`user_id = auth.uid()`) and anonymous (`user_id IS NULL`)
- Backend validates via API route (rate limiting, input validation)
- Status field managed by admins only (not via RLS)

---

### `signup_ip_tracking`
**Purpose**: Rate limit signups by IP address (prevent abuse)  
**No foreign keys** - standalone security table

**Recommended RLS Policies**:

| Operation | Policy | Reason |
|-----------|--------|--------|
| **SELECT** | `false` | No public access - backend only |
| **INSERT** | `false` | Backend only (service role) |
| **UPDATE** | `false` | Backend only |
| **DELETE** | `false` | Managed by backend cleanup jobs |

**Security Notes**:
- **CRITICAL**: Users must NEVER see IP tracking data
- All operations via service role
- Used by signup API to enforce rate limits (e.g., 5 signups per IP per day)
- Cleanup job should periodically delete old records

---

## Supporting Tables

### Storage Buckets

#### `resumes` Bucket
**Purpose**: Store student resume PDFs

**Recommended Storage Policies**:

```sql
-- Allow users to upload their own resumes
CREATE POLICY "Users can upload own resumes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to read their own resumes
CREATE POLICY "Users can read own resumes"
ON storage.objects FOR SELECT
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own resumes
CREATE POLICY "Users can delete own resumes"
ON storage.objects FOR DELETE
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Companies can view resumes of applicants
CREATE POLICY "Companies can view applicant resumes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'resumes' AND
  EXISTS (
    SELECT 1 FROM application a
    JOIN company_offer o ON a.offer_id = o.id
    WHERE o.company_id = auth.uid()
    AND a.student_id::text = (storage.foldername(name))[1]
  )
);
```

**Security Notes**:
- File path structure: `{user_id}/{filename}.pdf`
- Companies can ONLY view resumes of students who applied to their offers
- No public access to resumes

---

## Summary of Security Principles

### 1. **Least Privilege**
- Users can only access their own data
- Public access only where business logic requires (job offers, company profiles)

### 2. **Immutability for Financial/Audit Records**
- `credit_purchases` - prevent tampering with purchase history
- `daily_credit_grants` - prevent double-claiming
- `user_feedback` - preserve original submission

### 3. **Service Role for Sensitive Operations**
- Credit system uses `SECURITY DEFINER` functions
- Stripe webhooks use service role to bypass RLS
- Signup IP tracking uses service role

### 4. **Prevent Duplicate Records**
- INSERT policies check for existing records where only one should exist
- Examples: student profile, work preferences, API token

### 5. **Dual Visibility for Applications**
- Students see their applications
- Companies see applications to their offers
- Neither sees other's private data

### 6. **Storage Security**
- Bucket policies enforce folder-based access (`{user_id}/*`)
- Companies can view resumes only for their applicants

---

## Implementation Checklist

When creating/updating tables, ensure:

- [ ] RLS is ENABLED on all tables
- [ ] SELECT policies allow appropriate visibility
- [ ] INSERT policies prevent duplicate records where needed
- [ ] UPDATE policies restrict modifications to owners
- [ ] DELETE policies are restrictive (often `false`)
- [ ] Financial/audit tables use RPC functions only
- [ ] Storage buckets have matching policies
- [ ] Foreign keys exist for all relationships
- [ ] Indexes exist for RLS policy JOINs (performance)

---

## Testing RLS Policies

Test each policy by:

1. **As Owner**: Try SELECT/INSERT/UPDATE/DELETE on own data → Should succeed
2. **As Other User**: Try accessing another user's data → Should fail
3. **As Anonymous**: Try accessing without auth → Should fail (except public tables)
4. **As Company**: Try accessing student data → Should only work via application relationship
5. **Bypass Attempts**: Try direct API calls with forged IDs → Should be blocked by RLS

Use Supabase's RLS testing feature or write integration tests that authenticate as different users.

---

## Migration Strategy

To apply these policies to existing tables:

1. **Audit current policies**: `SELECT * FROM pg_policies WHERE schemaname = 'public';`
2. **Drop incorrect policies**: `DROP POLICY "policy_name" ON table_name;`
3. **Create new policies**: Use CREATE POLICY statements from this document
4. **Test thoroughly**: Run test suite with different user roles
5. **Deploy to production**: Apply migration during low-traffic window

---

**Last Updated**: January 12, 2026  
**Version**: 1.0  
**Maintainer**: Jobelix Security Team
