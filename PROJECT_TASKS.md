# Jobelix — MVP Task List (live)

Last updated: 2025-12-20

Legend: [x] = completed

## Quick purpose

Jobelix is a minimalist job marketplace MVP: students upload one PDF resume, companies post simple job offers. This file lists the planned phases and tasks and marks completed items with an X.

---

## Setup & discovery (done)

[x] Inspect repository and main files (`package.json`, `next.config.ts`, `tsconfig.json`, `app/*`, `postcss.config.mjs`, README)

## Phase 1 — Scaffold & Landing

[x] Create landing page with CTAs to signup as student or company (`app/page.tsx`)
[x] Create `/signup` route scaffold that reads `role` from search params (`app/signup/page.tsx`)
[x] Create client `SignupForm` component with email/password and placeholder submit (`app/signup/SignupForm.tsx`)
[x] Local test: run `npm run dev` and verify navigation and UI

## Phase 2 — Auth & Role Management

[x] 10. Create Supabase client (`lib/supabaseClient.ts`)
[x] 11. Build `/signup?role=student|company` (wired to mock API via `lib/api.signup()`)
[x] 12. Build `/login` (page + form calling `lib/api.login()`)
[x] 13. On signup:
    - Mock: creates fake user + profile and stores in localStorage
    - Real (later): Create auth user + insert into `profiles` with role
[x] 14. Redirect authenticated users to `/dashboard`

### Database & RLS — completed

[x] Database tables created:

- `public.profiles` (id -> auth.users(id), role enum/check, created_at)
- `public.student_resumes` (user_id -> auth.users(id), storage_path, filename, uploaded_at)
- `public.company_offers` (id, user_id -> auth.users(id), title, description, created_at)

[x] Row Level Security enabled on `profiles`, `student_resumes`, `company_offers` with policies restricting reads/inserts/updates to the owning user (based on `auth.uid()`).

[x] Supabase Storage policies for `resumes` bucket added to allow authenticated users to INSERT/UPDATE/SELECT objects only when the first path segment matches their user id (policy using `split_part(name, '/', 1)`).

Notes: since tables and policies are in place, next steps are to wire the client signup to call Supabase Auth and insert/update the `profiles` row on successful signup.

## Phase 3 — Dashboard Routing

[x] 15. Create `/dashboard` route
[x] 16. Fetch user profile on dashboard load (mock: from localStorage; real: from API)
[x] 17. If role = `student`: show resume upload UI (placeholder for Phase 4)
[x] 18. If role = `company`: show job offer creation UI + list (placeholder for Phase 5)

## Phase 4 — Student Resume Upload

[x] 19. Add file input (PDF only)
[x] 20. Validate file size/type on client (PDF only, max 5MB)
[x] 21. Upload to Supabase Storage: `resumes/<user_id>/resume.pdf` (mock: calls /api/mock/resume)
[x] 22. Upsert metadata into `student_resumes` table (mock: returns fake metadata)
[x] 23. Show upload success / replace state

## Phase 5 — Company Job Offers

[x] 24. Create job offer form (title + description)
[x] 25. Insert into `company_offers` (mock: calls /api/mock/offers POST)
[x] 26. List company's own offers (mock: calls /api/mock/offers GET)
[x] 27. Allow basic edit/update of offers (delete implemented; edit can be added later)

## Phase 6 — Deployment & Validation

[ ] 28. Set Supabase Auth site URL to Vercel domain
[ ] 29. Test full signup → dashboard flow
[ ] 30. Test RLS rules:
    - student cannot see other resumes
    - company cannot see other offers
[ ] 31. Push final MVP version to repository
[ ] 32. Share with first users

---

Notes
- This file is the canonical MVP checklist. I will update it when I complete items (or you can ask me to update it at any time).
- **Phase 1-5 complete**: Full MVP frontend working with mock API endpoints!
  - ✅ Landing page, signup, login
  - ✅ Dashboard with role-based UI
  - ✅ Student resume upload (auto-upload, validation, feedback)
  - ✅ Company job offers (create, list, delete)
- **Mock mode enabled**: `NEXT_PUBLIC_USE_MOCKS=true` routes all API calls to `/api/mock/*`.
- **Ready for backend handoff**: Your friend can implement real `/api/*` endpoints using `docs/backend-handoff.md`.
- **Next**: Phase 6 (deployment, RLS testing, production validation).
