# Database Schema Reference

Complete database schema for Jobelix with all student and company tables.

---

## Table of Contents
1. [Student Tables](#student-tables)
2. [Company Tables](#company-tables)
3. [Relationships & Data Flow](#relationships--data-flow)

---

## Student Tables

### 1. `student` (Main Profile Table)

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key, references `auth.users.id` (student's auth account) |
| `created_at` | timestamptz | When student account was created |
| `first_name` | text | Student's first name |
| `last_name` | text | Student's last name |
| `mail_adress` | text | Student's email address |
| `phone_number` | text | Student's phone number |
| `address` | text | Student's physical address |
| `description` | text | Student's bio/summary (max 500 chars) |

### 2. `student_profile_draft` (Draft Workspace)

**Purpose:** Temporary JSONB storage for profile data during AI extraction and editing. Auto-saves changes before finalization.

| Field | Type | Description | Maps To (After Finalize) |
|-------|------|-------------|--------------------------|
| `id` | uuid | Draft identifier | - |
| `student_id` | uuid | Foreign key to `student.id` | - |
| `raw_resume_text` | text | Original resume text extracted from PDF | - |
| `first_name` | text | First name (JSONB-like flexible field) | `student.first_name` |
| `last_name` | text | Last name (JSONB-like flexible field) | `student.last_name` |
| `phone_number` | text | Phone number | `student.phone_number` |
| `mail_adress` | text | Email address | `student.mail_adress` |
| `address` | text | Physical address | `student.address` |
| `education` | jsonb | Array of education objects: `[{school_name, degree, description, start_year, start_month, end_year, end_month}]` | `academic` table rows |
| `experience` | jsonb | Array of work experience objects: `[{organisation_name, position_name, description, start_year, start_month, end_year, end_month}]` | `experience` table rows |
| `projects` | jsonb | Array of project objects: `[{project_name, description, link}]` | `project` table rows |
| `skills` | jsonb | Array of skill objects: `[{skill_name, skill_slug}]` | `student_skill` table rows |
| `languages` | jsonb | Array of language objects: `[{language_name, proficiency_level}]` | `language` table rows |
| `publications` | jsonb | Array of publication objects: `[{title, authors, publication_date, link, description}]` | `publication` table rows |
| `certifications` | jsonb | Array of certification objects: `[{title, issuer, date_obtained}]` | `certification` table rows |
| `social_links` | jsonb | Array of social link objects: `[{link}]` | `social_link` table rows |
| `extraction_confidence` | jsonb | AI confidence scores for extracted data | - |
| `chat_history` | jsonb | Conversation history with AI assistant | - |
| `status` | text | Draft status: 'extracting', 'reviewing', 'confirmed' | - |
| `created_at` | timestamptz | When draft was created | - |
| `updated_at` | timestamptz | Last modification timestamp | - |

**Data Flow:** Upload resume → AI extracts to JSONB → User edits → `finalize_student_profile()` RPC → Data written to 8 normalized tables

### 3. `academic` (Education History)

| Field | Type | Description | Draft Source |
|-------|------|-------------|--------------|
| `id` | uuid | Primary key | - |
| `student_id` | uuid | Foreign key to `student.id` | `student_profile_draft.student_id` |
| `created_at` | timestamptz | When record was created | - |
| `school_name` | text | Name of educational institution | `education[].school_name` |
| `degree` | text | Degree/diploma obtained or pursuing | `education[].degree` |
| `description` | text | Additional details about coursework/achievements | `education[].description` |
| `start_year` | integer | Year started (e.g., 2020) | `education[].start_year` |
| `start_month` | integer | Month started (1-12) | `education[].start_month` |
| `end_year` | integer | Year ended or expected to end | `education[].end_year` |
| `end_month` | integer | Month ended (1-12) | `education[].end_month` |

### 4. `experience` (Work History)

| Field | Type | Description | Draft Source |
|-------|------|-------------|--------------|
| `id` | uuid | Primary key | - |
| `student_id` | uuid | Foreign key to `student.id` | `student_profile_draft.student_id` |
| `created_at` | timestamptz | When record was created | - |
| `organisation_name` | text | Company/organization name | `experience[].organisation_name` |
| `position_name` | text | Job title/role | `experience[].position_name` |
| `description` | text | Responsibilities and achievements | `experience[].description` |
| `start_year` | integer | Year started | `experience[].start_year` |
| `start_month` | integer | Month started (1-12) | `experience[].start_month` |
| `end_year` | integer | Year ended (null if current job) | `experience[].end_year` |
| `end_month` | integer | Month ended (1-12) | `experience[].end_month` |

### 5. `project` (Personal/Academic Projects)

| Field | Type | Description | Draft Source |
|-------|------|-------------|--------------|
| `id` | uuid | Primary key | - |
| `student_id` | uuid | Foreign key to `student.id` | `student_profile_draft.student_id` |
| `created_at` | timestamptz | When record was created | - |
| `project_name` | text | Name of the project | `projects[].project_name` |
| `description` | text | What the project does/accomplishes | `projects[].description` |
| `link` | text | URL to project (GitHub, demo, etc.) | `projects[].link` |

### 6. `student_skill` (Skills)

| Field | Type | Description | Draft Source |
|-------|------|-------------|--------------|
| `id` | uuid | Primary key | - |
| `student_id` | uuid | Foreign key to `student.id` | `student_profile_draft.student_id` |
| `created_at` | timestamptz | When skill was added | - |
| `skill_name` | text | Display name of skill (e.g., "React.js") | `skills[].skill_name` |
| `skill_slug` | text | Normalized identifier for matching (e.g., "react") | `skills[].skill_slug` |

**Unique Constraint:** `(student_id, skill_slug)` - Prevents duplicate skills

**Matching:** `student_skill.skill_slug` matches against `offer_skills.skill_slug` for job matching

### 7. `language` (Languages Spoken)

| Field | Type | Description | Draft Source |
|-------|------|-------------|--------------|
| `id` | uuid | Primary key | - |
| `student_id` | uuid | Foreign key to `student.id` | `student_profile_draft.student_id` |
| `created_at` | timestamptz | When language was added | - |
| `language_name` | text | Name of language (e.g., "English", "Spanish") | `languages[].language_name` |
| `proficiency_level` | text | Proficiency: 'Native', 'Fluent', 'Advanced', 'Intermediate', 'Beginner' | `languages[].proficiency_level` |

### 8. `publication` (Research Publications)

| Field | Type | Description | Draft Source |
|-------|------|-------------|--------------|
| `id` | uuid | Primary key | - |
| `student_id` | uuid | Foreign key to `student.id` | `student_profile_draft.student_id` |
| `created_at` | timestamptz | When publication was added | - |
| `title` | text | Title of publication | `publications[].title` |
| `authors` | text | List of authors | `publications[].authors` |
| `publication_date` | text | When published (free text: "2023", "May 2022", etc.) | `publications[].publication_date` |
| `link` | text | URL to publication (DOI, PDF, etc.) | `publications[].link` |
| `description` | text | Abstract or summary | `publications[].description` |

### 9. `certification` (Certifications & Licenses)

| Field | Type | Description | Draft Source |
|-------|------|-------------|--------------|
| `id` | uuid | Primary key | - |
| `student_id` | uuid | Foreign key to `student.id` | `student_profile_draft.student_id` |
| `created_at` | timestamptz | When certification was added | - |
| `title` | text | Name of certification (e.g., "AWS Solutions Architect") | `certifications[].title` |
| `issuer` | text | Issuing organization (e.g., "Amazon Web Services") | `certifications[].issuer` |
| `date_obtained` | text | When obtained (free text: "2023", "June 2022", etc.) | `certifications[].date_obtained` |

### 10. `social_link` (Social Media/Portfolio Links)

| Field | Type | Description | Draft Source |
|-------|------|-------------|--------------|
| `id` | uuid | Primary key | - |
| `student_id` | uuid | Foreign key to `student.id` | `student_profile_draft.student_id` |
| `created_at` | timestamptz | When link was added | - |
| `link` | text | URL (LinkedIn, GitHub, portfolio, etc.) | `social_links[].link` |

### 11. `resume` (Uploaded Resume Files)

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `student_id` | uuid | Foreign key to `student.id` |
| `created_at` | timestamptz | When resume was uploaded |
| `pdf_path` | text | Storage path in Supabase Storage (`resumes` bucket) |
| `extraction_status` | text | Status: 'pending', 'processing', 'completed', 'failed' |

**Purpose:** Tracks uploaded resume PDFs. PDF stored in Supabase Storage, path stored here.

---

## Company Tables

### 1. `company` (Company Profile)

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key, references `auth.users.id` (company's auth account) |
| `created_at` | timestamptz | When company account was created |
| `company_name` | text | Company name |
| `description` | text | Company description/about |
| `mail_adress` | text | Company email address |

**Note:** `company.id` IS the auth user ID (not a separate user_id column)

### 2. `company_offer_draft` (Draft Workspace)

**Purpose:** Temporary JSONB storage for offer data during creation and editing. Auto-saves changes before publishing.

| Field | Type | Description | Maps To (After Publish) |
|-------|------|-------------|-------------------------|
| `id` | uuid | Draft identifier | - |
| `company_id` | uuid | Foreign key to `company.id` | `company_offer.company_id` |
| `offer_id` | uuid | Links to published offer if editing existing | `company_offer.id` |
| `basic_info` | jsonb | Object: `{position_name, description}` | `company_offer.position_name`, `company_offer.description` |
| `compensation` | jsonb | Object: `{salary_min, salary_max, salary_currency, salary_period, equity, equity_range}` | `company_offer.salary_*`, `company_offer.equity*` |
| `work_config` | jsonb | Object: `{remote_mode, employment_type, availability}` | `company_offer.remote_mode`, `company_offer.employment_type`, etc. |
| `startup_signals` | jsonb | Object: `{mission, stage, team_size, seniority}` | `company_offer.mission`, `company_offer.stage`, etc. |
| `skills` | jsonb | Array: `[{skill_slug, skill_text, importance, level, years}]` | `offer_skills` table rows |
| `locations` | jsonb | Array: `[{city, country}]` | `offer_locations` table rows |
| `responsibilities` | jsonb | Array: `[{text}]` | `offer_responsibilities` table rows |
| `capabilities` | jsonb | Array: `[{text, importance}]` | `offer_capabilities` table rows |
| `questions` | jsonb | Array: `[{question}]` | `offer_questions` table rows |
| `perks` | jsonb | Array: `[{text}]` | `offer_perks` table rows |
| `status` | text | Draft status: 'editing', 'ready_to_publish' | - |
| `created_at` | timestamptz | When draft was created | - |
| `updated_at` | timestamptz | Last modification timestamp | - |

**Data Flow:** Create offer → Edit in UI (auto-save to JSONB) → `publish_company_offer()` RPC → Data written to `company_offer` + 6 normalized tables

**Date Handling:** Draft stores dates as `{year: 2026, month: 3}` objects for flexible UI. RPC converts to SQL `date` type on publish.

### 3. `company_offer` (Published Job Offers)

| Field | Type | Description | Draft Source |
|-------|------|-------------|--------------|
| `id` | uuid | Primary key | - |
| `company_id` | uuid | Foreign key to `company.id` | `company_offer_draft.company_id` |
| `created_at` | timestamptz | When offer was created | - |
| `position_name` | text | Job title (required) | `basic_info.position_name` |
| `description` | text | Full job description | `basic_info.description` |
| `status` | text | 'draft', 'published', 'closed' | - |
| `published_at` | timestamptz | When offer was published | - |
| `salary_min` | integer | Minimum salary | `compensation.salary_min` |
| `salary_max` | integer | Maximum salary | `compensation.salary_max` |
| `salary_currency` | text | 3-char currency code (EUR, USD, GBP) | `compensation.salary_currency` |
| `salary_period` | text | 'hour', 'day', 'month', 'year' | `compensation.salary_period` |
| `equity` | boolean | Equity offered? | `compensation.equity` |
| `equity_range` | text | Equity range (e.g., "0.1-0.5%") | `compensation.equity_range` |
| `remote_mode` | text | 'onsite', 'hybrid', 'remote' | `work_config.remote_mode` |
| `employment_type` | text | 'full_time', 'part_time', 'contract', 'intern' | `work_config.employment_type` |
| `availability` | text | Availability description | `work_config.availability` |
| `mission` | text | Company/team mission | `startup_signals.mission` |
| `stage` | text | Funding stage: 'preseed' → 'public' | `startup_signals.stage` |
| `team_size` | integer | Number of people on team | `startup_signals.team_size` |
| `seniority` | text | 'junior', 'mid', 'senior', 'lead', 'principal', 'staff' | `startup_signals.seniority` |

**Visibility:**
- `status='draft'`: Only visible to owning company
- `status='published'`: Visible to all students (RLS policy)
- `status='closed'`: Only visible to owning company

### 4. `offer_skills` (Required/Preferred Skills)

| Field | Type | Description | Draft Source |
|-------|------|-------------|--------------|
| `id` | uuid | Primary key | - |
| `offer_id` | uuid | Foreign key to `company_offer.id` (CASCADE DELETE) | - |
| `skill_slug` | text | Normalized skill identifier (e.g., "react") - **used for matching** | `skills[].skill_slug` |
| `skill_text` | text | Display name (e.g., "React.js") | `skills[].skill_text` |
| `importance` | text | 'must' (required) or 'nice' (preferred) | `skills[].importance` |
| `level` | text | Optional expertise level (e.g., "Advanced") | `skills[].level` |
| `years` | integer | Optional years of experience | `skills[].years` |
| `created_at` | timestamptz | When skill was added | - |

**Unique Constraint:** `(offer_id, skill_slug)` - Prevents duplicate skills per offer

**Matching:** `offer_skills.skill_slug` matches against `student_skill.skill_slug` for job matching

### 5. `offer_locations` (Geographic Locations)

| Field | Type | Description | Draft Source |
|-------|------|-------------|--------------|
| `id` | uuid | Primary key | - |
| `offer_id` | uuid | Foreign key to `company_offer.id` (CASCADE DELETE) | - |
| `city` | text | City name (e.g., "San Francisco") | `locations[].city` |
| `country` | text | Country (e.g., "USA", "Remote") | `locations[].country` |
| `created_at` | timestamptz | When location was added | - |

**Purpose:** Supports multiple locations per offer (e.g., SF or NYC). Students can filter by preferred location.

### 6. `offer_responsibilities` (Job Responsibilities)

| Field | Type | Description | Draft Source |
|-------|------|-------------|--------------|
| `id` | uuid | Primary key | - |
| `offer_id` | uuid | Foreign key to `company_offer.id` (CASCADE DELETE) | - |
| `text` | text | Responsibility description (e.g., "Build payment processing system") | `responsibilities[].text` |
| `created_at` | timestamptz | When responsibility was added (determines display order) | - |

**Display Order:** Displayed in insertion order (`ORDER BY created_at`)

### 7. `offer_capabilities` (Outcome-Based Requirements)

| Field | Type | Description | Draft Source |
|-------|------|-------------|--------------|
| `id` | uuid | Primary key | - |
| `offer_id` | uuid | Foreign key to `company_offer.id` (CASCADE DELETE) | - |
| `text` | text | Capability description (e.g., "Shipped a product to 10k+ users") | `capabilities[].text` |
| `importance` | text | 'must' (required) or 'nice' (preferred) | `capabilities[].importance` |
| `created_at` | timestamptz | When capability was added (determines display order) | - |

**Purpose:** Startup-style requirements focusing on what candidate has accomplished (not years of experience)

**Display Order:** Displayed in insertion order (`ORDER BY created_at`)

### 8. `offer_questions` (Screening Questions)

| Field | Type | Description | Draft Source |
|-------|------|-------------|--------------|
| `id` | uuid | Primary key | - |
| `offer_id` | uuid | Foreign key to `company_offer.id` (CASCADE DELETE) | - |
| `question` | text | Question text (e.g., "Why do you want to work here?") | `questions[].question` |
| `order_index` | integer | Display order for questions | - |
| `created_at` | timestamptz | When question was added | - |

**Purpose:** Simple text screening questions for candidates. Answers will be free-form text.

**Display Order:** Displayed by `order_index` or insertion order (`ORDER BY created_at`)

### 9. `offer_perks` (Benefits & Perks)

| Field | Type | Description | Draft Source |
|-------|------|-------------|--------------|
| `id` | uuid | Primary key | - |
| `offer_id` | uuid | Foreign key to `company_offer.id` (CASCADE DELETE) | - |
| `text` | text | Perk description (e.g., "Health insurance", "Equity options") | `perks[].text` |
| `created_at` | timestamptz | When perk was added (determines display order) | - |

**Display Order:** Displayed in insertion order (`ORDER BY created_at`)

---

## Relationships & Data Flow

### Student Profile Flow

```
1. Upload Resume PDF
   ↓
   resume table (pdf_path stored)
   
2. AI Extracts Data
   ↓
   student_profile_draft (all data as JSONB)
   ↓
   User reviews/edits in UI (auto-saves to draft)
   
3. User Finalizes
   ↓
   finalize_student_profile() RPC
   ↓
   Data written to 8 normalized tables:
   - student (basic info)
   - academic (education array → rows)
   - experience (experience array → rows)
   - project (projects array → rows)
   - student_skill (skills array → rows)
   - language (languages array → rows)
   - publication (publications array → rows)
   - certification (certifications array → rows)
   - social_link (social_links array → rows)
```

**Key Pattern:**
- **Draft = JSONB** (flexible, partial data OK, dates as `{year, month}`)
- **Published = Normalized** (strict schema, proper types, indexed for queries)

### Company Offer Flow

```
1. Create Offer
   ↓
   company_offer_draft (blank JSONB structure)
   ↓
   Company fills out form (auto-saves to draft)
   
2. Company Publishes
   ↓
   publish_company_offer() RPC
   ↓
   Data written to 1 main + 6 normalized tables:
   - company_offer (main scalar fields)
   - offer_skills (skills array → rows)
   - offer_locations (locations array → rows)
   - offer_responsibilities (responsibilities array → rows)
   - offer_capabilities (capabilities array → rows)
   - offer_questions (questions array → rows)
   - offer_perks (perks array → rows)
```

**Key Pattern:**
- **Draft = JSONB** (flexible editing, dates as `{year, month}`)
- **Published = Normalized** (proper types, dates as SQL `date`, indexed for student queries)

### Matching Flow

```
Student Skills          Company Offer Skills
    ↓                          ↓
student_skill.skill_slug  =  offer_skills.skill_slug
                          ↓
                    Match Score
                    (must > nice)
```

**Skill Matching:**
1. Both students and offers use `skill_slug` for normalized matching
2. `student_skill.skill_slug` compared with `offer_skills.skill_slug`
3. Offers mark skills as 'must' (required) or 'nice' (preferred)
4. Match score weighted by importance

### Foreign Key Relationships

**Student Side:**
```
student (id)
  ├─→ student_profile_draft (student_id)
  ├─→ academic (student_id)
  ├─→ experience (student_id)
  ├─→ project (student_id)
  ├─→ student_skill (student_id)
  ├─→ language (student_id)
  ├─→ publication (student_id)
  ├─→ certification (student_id)
  ├─→ social_link (student_id)
  └─→ resume (student_id)
```

**Company Side:**
```
company (id)
  ├─→ company_offer_draft (company_id)
  └─→ company_offer (company_id)
        ├─→ offer_skills (offer_id)
        ├─→ offer_locations (offer_id)
        ├─→ offer_responsibilities (offer_id)
        ├─→ offer_capabilities (offer_id)
        ├─→ offer_questions (offer_id)
        └─→ offer_perks (offer_id)
```

**All child tables use `ON DELETE CASCADE`** - Deleting a student/company/offer deletes all related data.

---

## RPC Functions

### `finalize_student_profile(p_user_id, p_profile, p_education, ...)`

**Purpose:** Atomically convert student_profile_draft JSONB → 8 normalized tables

**Parameters:**
- `p_user_id`: Student's auth user ID
- `p_profile`: Basic info JSONB
- `p_education`: Education array
- `p_experience`: Experience array
- `p_projects`: Projects array
- `p_skills`: Skills array
- `p_languages`: Languages array
- `p_publications`: Publications array
- `p_certifications`: Certifications array
- `p_social_links`: Social links array

**Process:**
1. Validate required fields
2. UPDATE student table with basic info
3. DELETE existing records from 8 child tables
4. INSERT new records from JSONB arrays
5. All in single transaction

### `publish_company_offer(p_draft_id)`

**Purpose:** Atomically convert company_offer_draft JSONB → company_offer + 6 normalized tables

**Parameters:**
- `p_draft_id`: ID of draft to publish

**Process:**
1. Validate required fields (position_name, etc.)
2. Check if editing existing offer or creating new
3. INSERT or UPDATE company_offer with scalar fields
4. Convert `{year, month}` → SQL `date` type
5. DELETE existing records from 6 child tables (if updating)
6. INSERT new records from JSONB arrays
7. Link draft to published offer
8. All in single transaction

**Returns:** Published offer ID

---

## Summary

**Total Tables:**
- **Student:** 10 tables (1 main + 1 draft + 8 normalized)
- **Company:** 8 tables (1 main + 1 draft + 1 offers + 6 offer-related)

**Key Design Principles:**
1. **Draft tables use JSONB** - Flexible, allows partial data, easy auto-save
2. **Published tables are normalized** - Strict types, indexed, optimized for queries
3. **RPC functions handle conversion** - Atomic transactions ensure consistency
4. **Skill slugs enable matching** - Normalized identifiers across student/company
5. **RLS policies enforce security** - Companies see own drafts, students see published offers
6. **Insertion order for display** - No explicit `order_index`, use `created_at` timestamp
