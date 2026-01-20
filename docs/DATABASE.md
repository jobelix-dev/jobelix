# Jobelix Database Architecture

## Overview

Jobelix uses a PostgreSQL database via Supabase with a unique **Draft → Finalize** pattern for both student profiles and company job offers. This pattern allows flexible data collection (via AI + chat) in JSONB format, followed by atomic transformation into normalized relational tables.

## Core Architecture Principles

### 1. Dual-Stage Data Pattern

**Problem Solved**: AI-extracted data from resumes is incomplete and uncertain. Manual corrections happen iteratively through chat.

**Solution**: Store unfinalized data as flexible JSONB, transform to strict schema only when complete.

```
┌─────────────────┐         ┌──────────────────┐
│  Draft (JSONB)  │  RPC    │  Normalized SQL  │
│  Flexible       │ ────▶   │  Strict Schema   │
│  AI + Chat      │ Atomic  │  Read-Only       │
└─────────────────┘         └──────────────────┘
```

### 2. Authentication Flow

```
auth.users (Supabase Auth)
    │
    ├─▶ student (id references auth.users)
    │       └─▶ 8 child tables (academic, experience, etc.)
    │
    └─▶ company (id references auth.users)
            └─▶ company_offer → 6 child tables
```

**Trigger**: `handle_new_user()` automatically creates `student` or `company` record based on `raw_user_meta_data.role` and generates API token.

## Entity Groups

### Student Profile System

#### Draft Stage
**Table**: `student_profile_draft`
- **Purpose**: Accumulate data from AI resume extraction + chat corrections
- **Schema**: JSONB columns for flexibility
- **Status**: `'editing'` | `'published'`
- **Key Columns**:
  ```sql
  raw_resume_text text
  student_name text
  email text, phone_number text, address text
  
  -- Arrays of objects (flexible validation)
  education jsonb         -- [{school_name, degree, dates, ...}]
  experience jsonb        -- [{organisation_name, position, dates, ...}]
  projects jsonb          -- [{project_name, description, link}]
  skills jsonb            -- [{skill_name, skill_slug}]
  languages jsonb         -- [{language_name, proficiency_level}]
  publications jsonb      -- [{title, journal_name, dates, ...}]
  certifications jsonb    -- [{name, issuing_organization, url}]
  
  -- Object (single record)
  social_links jsonb      -- {github, linkedin, stackoverflow, kaggle, leetcode}
  
  chat_history jsonb      -- [{role, content, timestamp}]
  ```

**Constraints**: 
- One draft per student (`student_id` UNIQUE)
- Address length ≤ 200 chars
- No strict validation (AI-friendly)

#### Finalized Stage
**Tables** (8 normalized):
1. **`student`** - Main profile (name, email, phone, address, description)
2. **`academic`** - Education entries (school, degree, dates)
   - Required: `start_year`, `start_month`
   - Optional: `end_year`, `end_month` (NULL = current)
3. **`experience`** - Work history (organization, position, dates)
   - Required: `start_year`, `start_month`
4. **`project`** - Personal/academic projects (name, description, link)
5. **`skill`** - Technical skills with slug for matching (skill_name, skill_slug)
6. **`language`** - Spoken languages (language_name, proficiency_level)
   - Proficiency: Beginner | Intermediate | Advanced | Fluent | Native
7. **`publication`** - Research papers (title, journal, dates, link)
8. **`certification`** - Certifications/awards (name, issuing_organization, url)
9. **`social_link`** - Single row with platform columns (github, linkedin, etc.)

**RPC Function**: `finalize_student_profile()`
```sql
finalize_student_profile(
  p_user_id uuid,
  p_profile jsonb,        -- Basic info
  p_education jsonb,      -- Array
  p_experience jsonb,     -- Array
  p_projects jsonb,       -- Array
  p_skills jsonb,         -- Array
  p_languages jsonb,      -- Array
  p_publications jsonb,   -- Array
  p_certifications jsonb, -- Array
  p_social_links jsonb    -- Object
) RETURNS jsonb
```

**Atomic Operations**:
1. UPSERT into `student` table (main profile)
2. DELETE all existing child records (academic, experience, etc.)
3. INSERT new records from JSONB arrays (with validation filters)
4. Return counts of inserted records

**Validation Rules** (in INSERT SELECT):
- Non-empty required fields (e.g., `school_name != ''`, `degree != ''`)
- Valid date ranges (1950-2050)
- Month values (1-12)
- String length limits enforced at database level

#### Resume Metadata
**Table**: `resume`
- **Purpose**: Track uploaded PDF in Supabase Storage bucket `resumes`
- **Columns**: `student_id` (PK), `file_name`, `created_at`
- **Storage Path**: `{user_id}/{filename}` in `resumes` bucket

---

### Company Offer System

#### Draft Stage
**Table**: `company_offer_draft`
- **Purpose**: Build job posting incrementally before publishing
- **Status**: `'editing'` | `'ready_to_publish'`
- **Key Columns** (JSONB):
  ```sql
  basic_info jsonb        -- {position_name, description}
  compensation jsonb      -- {salary_min, salary_max, currency, period, equity, equity_range}
  work_config jsonb       -- {remote_mode, employment_type, availability, start_date}
  seniority text          -- Enum column (not JSONB)
  
  -- Arrays
  skills jsonb            -- [{skill_slug, skill_text, importance, level, years}]
  locations jsonb         -- [{city, country}]
  responsibilities jsonb  -- [texts]
  capabilities jsonb      -- [{text, importance}]
  questions jsonb         -- [questions]
  perks jsonb             -- [texts]
  ```

**Constraints**:
- One active draft per offer: `UNIQUE (offer_id) WHERE status IN ('editing', 'ready_to_publish')`
- Can create multiple drafts for different offers
- Seniority: `junior` | `mid` | `senior` | `lead` | `principal` | `staff`

#### Finalized Stage
**Tables** (7 normalized):
1. **`company_offer`** - Main offer record
   - `position_name`, `description`, `status`
   - Salary fields: `salary_min`, `salary_max`, `salary_currency`, `salary_period`
   - `equity` (boolean), `equity_range` (text)
   - Enums: `remote_mode`, `employment_type`, `seniority`, `status`
   - `published_at` timestamp
2. **`offer_skills`** - Required/nice-to-have skills
   - `skill_slug` (for matching), `skill_text`, `importance` (must/nice), `level`, `years`
   - UNIQUE constraint: `(offer_id, skill_slug)`
3. **`offer_locations`** - Work locations
   - `city`, `country`
4. **`offer_responsibilities`** - Job duties (bullet points)
   - `text`
5. **`offer_capabilities`** - Required capabilities
   - `text`, `importance` (must/nice)
6. **`offer_questions`** - Screening questions
   - `question`
7. **`offer_perks`** - Benefits offered
   - `text`

**Enums**:
- **Status**: `draft` | `published` | `closed`
- **Remote Mode**: `onsite` | `hybrid` | `remote`
- **Employment Type**: `full_time` | `part_time` | `contract` | `intern`
- **Seniority**: `junior` | `mid` | `senior` | `lead` | `principal` | `staff`
- **Importance**: `must` | `nice`

**RPC Function**: `publish_offer_draft()`
```sql
publish_offer_draft(p_draft_id uuid) RETURNS uuid
```

**Atomic Operations**:
1. Fetch draft data with ownership verification (`company_id = auth.uid()`)
2. UPSERT into `company_offer` (create new or update existing)
3. DELETE old child records (skills, locations, etc.)
4. INSERT new child records from JSONB arrays
5. Mark draft as completed or delete
6. Return `offer_id`

**Foreign Key Behavior**: 
- `offer_id` in draft: ON DELETE SET NULL (preserves draft if offer deleted)
- All offer child tables: ON DELETE CASCADE (cleanup when offer deleted)

---

### Application System

**Table**: `application`
- **Purpose**: Track student applications to job offers
- **Columns**:
  - `student_id` → `student.id` (CASCADE)
  - `offer_id` → `company_offer.id` (CASCADE)
  - `curent_state` (typo intentional per requirement): status string
  - `priority` (smallint): company-set ranking (0-based)

**Table**: `student_work_preferences`
- **Purpose**: Job search filters and required application fields
- **Columns**:
  - Experience levels, job types, date filters (booleans)
  - `positions` text[], `locations` text[], blacklists
  - Demographics: `date_of_birth`, `pronouns`, `gender`, `ethnicity`
  - Authorizations: `eu_work_authorization`, `us_work_authorization`
  - Preferences: `open_to_relocation`, `willing_to_complete_assessments`, etc.
  - `salary_expectation_usd` (integer)
- **Constraint**: One preference row per student (UNIQUE `student_id`)

---

### Credits & Payment System

#### Tables
1. **`user_credits`** - Current balance tracking
   - **Columns**: `balance`, `total_earned`, `total_purchased`, `total_used`, `last_updated`
   - **PK**: `user_id` (one row per user)

2. **`daily_credit_grants`** - Idempotency for free daily credits
   - **Composite PK**: `(user_id, granted_date)`
   - **Default**: 50 credits/day
   - Enforces: One claim per user per day

3. **`credit_purchases`** - Stripe payment records
   - **Idempotency Keys**: 
     - `stripe_event_id` UNIQUE (webhook idempotency)
     - `stripe_checkout_session_id` UNIQUE
     - `stripe_payment_intent_id` UNIQUE
   - **Status**: `pending` → `completed`
   - **Columns**: `credits_amount`, `price_cents`, `currency`, timestamps

#### Credit Flow

**Daily Free Credits**:
```sql
grant_daily_credits(p_user_id uuid)
RETURNS TABLE(success boolean, credits_granted integer, new_balance integer)
```
1. Try INSERT into `daily_credit_grants` (fails if already claimed today)
2. On success: UPDATE `user_credits` balance and total_earned
3. Create `user_credits` row if doesn't exist

**Purchased Credits**:
```sql
add_purchased_credits(
  p_user_id uuid,
  p_credits_amount integer,
  p_payment_intent_id text,
  p_stripe_event_id text,    -- Idempotency key
  p_session_id text,
  p_amount_cents integer,
  p_currency text
) RETURNS TABLE(success boolean, new_balance integer, error_message text)
```

**Idempotency Strategy**:
1. Lock purchase record by `stripe_event_id` (`FOR UPDATE NOWAIT`)
2. If locked/exists → return already processed
3. Update purchase from `pending` → `completed`
4. Add credits atomically (UPSERT into `user_credits`)
5. Handle race conditions with UNIQUE constraint catching

**Credit Consumption**:
```sql
use_credits(p_user_id uuid, p_amount integer DEFAULT 1)
RETURNS TABLE(success boolean, new_balance integer)
```
1. SELECT current balance `FOR UPDATE` (pessimistic locking)
2. Check sufficient balance
3. UPDATE balance and total_used
4. Return new balance

#### Feedback System
**Table**: `user_feedback`
- **Types**: `bug` | `feature`
- **Status**: `new` | `reviewing` | `resolved` | `wont_fix`
- **Columns**: `subject`, `description`, `user_email`, `page_url`, `user_agent`
- **Foreign Key**: `user_id` → auth.users (ON DELETE SET NULL, preserves feedback)

---

### API Tokens & Rate Limiting

#### Tables
1. **`api_tokens`** - Per-user tokens for external bot
   - **Auto-generated**: In `handle_new_user()` trigger
   - **UNIQUE**: One token per user (`user_id` UNIQUE)
   - **Tracking**: `total_tokens_used`, `total_cost_usd`, `last_used_at`

2. **`api_call_log`** - Rate limiting data
   - **Columns**: `user_id`, `endpoint`, `created_at`
   - **Cleanup**: `cleanup_old_api_logs()` deletes records > 30 days

#### RPC Functions

**Rate Limiting**:
```sql
check_api_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_hourly_limit integer DEFAULT 100,
  p_daily_limit integer DEFAULT 500
) RETURNS TABLE(
  allowed boolean,
  hourly_count bigint,
  daily_count bigint,
  hourly_remaining integer,
  daily_remaining integer
)
```

**Logging**:
```sql
log_api_call(p_user_id uuid, p_endpoint text) RETURNS uuid
```

**Token Management**:
```sql
update_token_last_used(p_token text) RETURNS void
update_token_usage(p_token text, p_tokens_used integer, p_cost_usd numeric) RETURNS void
```

---

## Security & Row Level Security (RLS)

### RLS Policies Pattern

**Enabled on all tables** (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)

#### Ownership-Based Policies
**Students**:
```sql
-- Student can only access own data
CREATE POLICY "students_own_data" ON student
  FOR ALL USING (auth.uid() = id);

-- Child tables inherit check
CREATE POLICY "students_own_academic" ON academic
  FOR ALL USING (
    student_id IN (SELECT id FROM student WHERE auth.uid() = id)
  );
```

**Companies**:
```sql
-- Company can only access own offers
CREATE POLICY "companies_own_offers" ON company_offer
  FOR ALL USING (
    company_id IN (SELECT id FROM company WHERE auth.uid() = id)
  );
```

#### Public Read Policies
```sql
-- Authenticated users can view published offers
CREATE POLICY "anyone_view_published_offers" ON company_offer
  FOR SELECT USING (status = 'published');
```

### Cascade Delete Behavior

**Critical for security**:
- `auth.users` deletion → cascades to `student`/`company`
- `student` deletion → cascades to all child tables (academic, experience, etc.)
- `company_offer` deletion → cascades to child tables (offer_skills, offer_locations, etc.)
- `company_offer_draft.offer_id` → ON DELETE SET NULL (preserves draft)

---

## Performance Optimizations

### Indexes

**Foreign Keys** (all child tables):
```sql
CREATE INDEX idx_academic_student ON academic(student_id);
CREATE INDEX idx_offer_skills_offer ON offer_skills(offer_id);
-- ... etc for all FK relationships
```

**Composite Indexes**:
```sql
-- API rate limiting
CREATE INDEX idx_api_call_log_user_endpoint 
  ON api_call_log(user_id, endpoint, created_at);

-- Credit purchase lookups
CREATE INDEX idx_credit_purchases_session_status 
  ON credit_purchases(stripe_checkout_session_id, status);

-- Daily grant date ordering
CREATE INDEX idx_daily_grants_user_date 
  ON daily_credit_grants(user_id, granted_date DESC);
```

**Skill Matching**:
```sql
CREATE INDEX skill_slug_idx ON skill(skill_slug) WHERE (skill_slug IS NOT NULL);
CREATE INDEX idx_offer_skills_skill_slug ON offer_skills(skill_slug);
```

### Triggers

**Auto-update timestamps**:
```sql
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON student_profile_draft
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON user_feedback
  FOR EACH ROW EXECUTE FUNCTION update_feedback_updated_at();
```

---

## Validation Rules

### Student Profile
- **Names**: ≤ 50 chars (first_name, last_name)
- **Address**: ≤ 200 chars
- **Phone**: ≤ 20 chars
- **Description**: ≤ 500 chars
- **Dates**: 1950-2050, months 1-12
- **URLs**: ≤ 500 chars
- **Start dates required**: `start_month` and `start_year` NOT NULL

### Company Offer
- **Salary Currency**: Exactly 3 chars (ISO code)
- **Salary Period**: hour | day | month | year
- **Remote Mode**: onsite | hybrid | remote
- **Employment Type**: full_time | part_time | contract | intern
- **Seniority**: junior | mid | senior | lead | principal | staff

### Certifications & Publications
- **Titles**: 1-300 chars
- **Names**: 1-200 chars
- **Organizations**: ≤ 200 chars
- **Descriptions**: ≤ 1000 chars

---

## Common Queries

### Get Complete Student Profile
```sql
SELECT 
  s.*,
  array_agg(DISTINCT a.*) as education,
  array_agg(DISTINCT e.*) as experience,
  array_agg(DISTINCT p.*) as projects,
  array_agg(DISTINCT sk.*) as skills
FROM student s
LEFT JOIN academic a ON a.student_id = s.id
LEFT JOIN experience e ON e.student_id = s.id
LEFT JOIN project p ON p.student_id = s.id
LEFT JOIN skill sk ON sk.student_id = s.id
WHERE s.id = :user_id
GROUP BY s.id;
```

### Get Published Offers with Details
```sql
SELECT 
  co.*,
  c.company_name,
  array_agg(DISTINCT os.*) as skills,
  array_agg(DISTINCT ol.*) as locations
FROM company_offer co
JOIN company c ON c.id = co.company_id
LEFT JOIN offer_skills os ON os.offer_id = co.id
LEFT JOIN offer_locations ol ON ol.offer_id = co.id
WHERE co.status = 'published'
GROUP BY co.id, c.company_name;
```

### Check User Credit Balance
```sql
SELECT balance, total_earned, total_purchased, total_used
FROM user_credits
WHERE user_id = :user_id;
```

---

## Migration Strategy

Migrations are organized chronologically with semantic naming:

1. **Base Auth** - User management foundation
2. **Student Profiles** - Complete student data model
3. **Company Offers** - Complete offer data model
4. **Applications** - Student-to-offer matching
5. **Credits & Payments** - Stripe integration
6. **API Tokens** - External bot access
7. **RLS Policies** - Security layer
8. **Indexes & Triggers** - Performance optimization

Each migration is self-contained and can be applied independently (respecting dependency order).

---

## Key Takeaways

1. **Never edit finalized data directly** - Always edit draft, then call finalize RPC
2. **Idempotency is critical** - All credit/payment operations use unique constraints
3. **RLS enforces ownership** - Database-level security, not application-level
4. **JSONB for flexibility** - Draft stage accepts imperfect AI data
5. **Atomic transformations** - RPC functions ensure data consistency
6. **Cascade deletes** - User deletion cleans up all related data automatically
