# Backend handoff

This document contains the SQL, RLS, storage policy notes, and the minimal API contract frontend expects. Use this to implement server-side handlers.

## Database schema (already applied)

-- Profiles to store role
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student','company')),
  created_at timestamptz not null default now()
);

-- Student resume metadata (one resume per student)
create table if not exists public.student_resumes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  storage_path text not null,
  filename text,
  uploaded_at timestamptz not null default now()
);

-- Company offers (simple)
create table if not exists public.company_offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

## RLS (already enabled)

Enable RLS on these tables and add policies that limit reads/inserts/updates to the owning user (using `auth.uid()`).

Example policies (already applied by frontend dev):

-- profiles
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id);

-- student_resumes
create policy "student_resumes_select_own"
on public.student_resumes for select
using (auth.uid() = user_id);

create policy "student_resumes_upsert_own"
on public.student_resumes for insert
with check (auth.uid() = user_id);

create policy "student_resumes_update_own"
on public.student_resumes for update
using (auth.uid() = user_id);

-- company_offers
create policy "company_offers_select_own"
on public.company_offers for select
using (auth.uid() = user_id);

create policy "company_offers_insert_own"
on public.company_offers for insert
with check (auth.uid() = user_id);

create policy "company_offers_update_own"
on public.company_offers for update
using (auth.uid() = user_id);

## Storage policies (resumes bucket)

Bucket: `resumes`

Policy predicate used for INSERT/UPDATE/SELECT:

```
(bucket_id = 'resumes')
AND (auth.uid()::text = split_part(name, '/', 1))
```

This ensures users can only operate on objects where the first path segment equals their user id (e.g. `resumes/<user_id>/resume.pdf`).

## Minimal API contract (frontend expectations)

All endpoints are JSON unless otherwise noted.

- POST /api/signup
  - body: { email, password, role }
  - response: { success: boolean, userId?: string, profile?: { id, role, created_at }, error?: string }

- POST /api/login
  - body: { email, password }
  - response: { success: boolean, session?: { /* supabase session shape */ }, error?: string }

- GET /api/profile
  - response: { id, role, created_at }

- POST /api/resume
  - body: multipart/form-data with `file` field
  - response: { storage_path, filename, uploaded_at }

- GET /api/offers
  - response: CompanyOffer[]

- POST /api/offers
  - body: { title, description }
  - response: created CompanyOffer object

## Notes for backend implementer

- Use Supabase Auth for signups/logins. The frontend will use the anon client for direct auth flows; you may also implement the above endpoints as server-side wrappers using the service role key if you prefer server-controlled signup.
- Keep the SQL and RLS policies consistent with the frontend expectations above.
- Implement proper error codes and messages so frontend can display errors.
