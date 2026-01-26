# AGENTS.md – Jobelix Codebase Guide

Job platform (students ↔ companies): resume upload + AI parsing, profile chat, job search, auto-apply bot, credit purchases.

---

## Tech Stack
- **Next.js 16.1** (App Router, React 19, Turbopack) + TypeScript strict
- **Supabase** (PostgreSQL + RLS, Auth)
- **Stripe** (credits: 100/300/500)
- **OpenAI** GPT-4o (resume parsing)
- **Electron** (optional desktop wrapper)
- **Tailwind CSS 4**

---

## Repo Map

```
app/
  api/              # Server routes (auth, student, company, stripe, oauth, autoapply)
  dashboard/        # Student & company dashboards
  components/       # UI components
  (auth pages)/     # login, signup, reset-password
lib/
  client/           # Browser-only (supabaseClient, API calls, hooks)
  server/           # Server-only (secrets, DB, Stripe, GitHub OAuth, OpenAI)
  shared/           # Types/schemas (no runtime secrets)
supabase/
  migrations/       # Timestamped .sql files (order matters)
  config.toml       # Local dev config (ports 54321/54322)
src/main/           # Electron main process
resources/          # Python bot runtime (per OS)
scripts/            # fetch-python-runtime.mjs, release.mjs
```

---

## Setup

**Prereqs**: Node 20+, npm (uses `package-lock.json`, not pnpm/yarn)

```bash
npm install
# Auto-runs postinstall (patch-package)
```

**Env vars** (`.env.local`, never commit):
```bash
# Public (NEXT_PUBLIC_* = safe in browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Server-only (never expose)
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_CREDITS_100=price_...
STRIPE_PRICE_CREDITS_300=price_...
STRIPE_PRICE_CREDITS_500=price_...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
OPENAI_API_KEY=sk-...
```
See `.env.example`.

---

## Commands

```bash
npm run dev              # Next dev (localhost:3000)
npm run build            # Prod build (typecheck + bundle)
npm run start            # Serve prod build
npm run lint             # ESLint (eslint.config.mjs)
npm run fetch:bot        # DL Python bot runtime (needs PY_RUNTIME_TAG)
npm run build-installer  # Electron dist
```

**No tests yet** – verify via lint + build + manual testing.

---

## Quality Gates

Before commit:
1. `npm run lint`
2. `npx tsc --noEmit` (strict mode, catches type errors)
3. `npm run build` (catches runtime issues)

---

## Code Patterns

### Client vs Server
- **Client**: `'use client'` directive (interactive UI, hooks)
- **Server**: `import "server-only"` in `lib/server/*` (secrets, DB, Stripe, OpenAI)
- **API routes**: Always server-side (`app/api/*`)

### Supabase
- **Client**: `lib/client/supabaseClient.ts` (RLS enforced, browser-safe)
- **Server**: `lib/server/supabaseService.ts` (service role, bypasses RLS when needed)
- **RPCs**: `.rpc('function_name', { params })` for atomic ops (e.g., credit grants)

---

## Data Layer Rules (CRITICAL)

### Migrations
1. **Never edit existing** – append new `YYYYMMDDHHMMSS_description.sql`
2. **Test**: `supabase db reset` (re-runs all from scratch)
3. **RLS on**: Every table has `enable row level security` + policies
4. **Immutable cols**: Protected by triggers (`id`, `created_at`, FKs, `stripe_event_id`, etc.)

### RLS Policies
- **Students**: `student_id = (SELECT auth.uid())`
- **Companies**: `company_id = (SELECT auth.uid())`
- **Applications**: Students see own, companies see applications to their offers
- **Credits**: Own balance only

Example:
```sql
CREATE POLICY "select_own" ON student_profiles
  FOR SELECT USING (student_id = (SELECT auth.uid()));
```

### DB Functions (SECURITY DEFINER)
- `complete_stripe_purchase_and_add_credits()` – atomic credit grant
- `grant_daily_credits()` – daily free credits
- `check_api_rate_limit()` – rate limit check
All bypass RLS when safe (server-only calls).

---

## Payments Rules (CRITICAL)

### Stripe
1. **Webhook signature**: Always verify (`app/api/stripe/webhook/route.ts`)
2. **Idempotency**: Use `stripe_event_id` (unique constraint) to prevent duplicate credits
3. **Server-authoritative**: Never trust client for price/credits
4. **Atomic ops**: Use RPC `complete_stripe_purchase_and_add_credits()`
5. **Status**: `pending` → `completed` (webhook driven)

**Safe pattern**:
```typescript
// ✅ CORRECT
await supabase.rpc('complete_stripe_purchase_and_add_credits', {
  p_purchase_id: purchaseId,
  p_stripe_event_id: event.id
});

// ❌ WRONG (bypasses idempotency)
await supabase.from('user_credits').update({ balance: balance + 100 });
```

**Test webhooks**: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

---

## Electron / Python Bot

- **Entry**: `src/main/index.js`, preload: `preload.js`
- **Bot runtime**: `npm run fetch:bot` (from GitHub releases, needs `PY_RUNTIME_TAG`)
- **Platforms**: win/mac/linux/arch (resources/<os>/)

---

## PR Guidelines

1. **Small diffs** – one logical change per PR
2. **Match patterns** – follow nearby code style
3. **Verify locally** – `npm run lint`, `npm run build`, `npm run dev`
4. **Migrations** – append only, never edit existing
5. **Secrets** – env vars only, never hardcode
6. **RLS** – maintain policies for new tables
7. **Types** – fix TS errors immediately
8. **Idempotency** – Stripe webhooks must handle retries

---

## Common Tasks

### New API route
1. `app/api/your-route/route.ts`
2. `import "server-only"`
3. Use `getServiceSupabase()` for DB
4. Validate auth via cookies + Supabase session

### New table
1. `supabase/migrations/YYYYMMDDHHMMSS_new_table.sql`
2. `enable row level security`, add policies
3. Indexes on FKs
4. Test: `supabase db reset`

### Stripe changes
1. **Never skip signature verification**
2. **Idempotency keys** (`stripe_event_id`)
3. **RPC functions** for credits
4. Test via Stripe CLI

---

## Security Checklist
- [ ] No secrets in code (env vars only)
- [ ] `server-only` imports for sensitive logic
- [ ] RLS policies on new tables
- [ ] Stripe signature verification
- [ ] Input validation (Zod schemas)
- [ ] Auth checks on API routes

---

## Read First
1. `package.json` – scripts, deps
2. `next.config.ts` – CSP, security headers
3. `supabase/migrations/` – DB schema (in order)
4. `lib/server/supabaseService.ts` – DB patterns
5. `app/api/stripe/webhook/route.ts` – payment flow

---

**Principle**: Security > convenience. Never bypass RLS or webhook verification. Match existing patterns. When in doubt, ask.
