# Project Architecture

This document explains how Jobelix is structured and how all the pieces fit together.

## Table of Contents
1. [High-Level Overview](#high-level-overview)
2. [Directory Structure](#directory-structure)
3. [Data Flow](#data-flow)
4. [Key Components](#key-components)
5. [Database Architecture](#database-architecture)
6. [Authentication Flow](#authentication-flow)
7. [Resume Processing Pipeline](#resume-processing-pipeline)

---

## High-Level Overview

Jobelix is a **full-stack Next.js application** using the App Router pattern. This means:

- **Frontend and Backend in one project**
- **File-based routing** (folders = URL paths)
- **Server and Client components** can coexist
- **API routes** live alongside pages

```
┌─────────────────────────────────────────────────────────┐
│                      USER BROWSER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Landing    │  │    Login     │  │   Dashboard  │  │
│  │     Page     │  │     Page     │  │     Page     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────┐
│                     NEXT.JS SERVER                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Page Routes │  │  API Routes  │  │  Components  │  │
│  │  (Frontend)  │  │  (Backend)   │  │  (Shared)    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    ↓               ↓
          ┌──────────────┐  ┌──────────────┐
          │   Supabase   │  │    OpenAI    │
          │  (Database)  │  │     (AI)     │
          └──────────────┘  └──────────────┘
```

---

## Directory Structure

### Root Level
```
jobelix/
├── app/                # Next.js App Router (pages + API)
├── components/         # Reusable React components
├── lib/               # Utility functions and helpers
├── supabase/          # Database migrations and config
├── docs/              # Documentation (you are here!)
├── public/            # Static assets (images, etc.)
├── .env.local         # Environment variables (not in git)
├── package.json       # Project dependencies
├── tsconfig.json      # TypeScript configuration
└── next.config.ts     # Next.js configuration
```

### App Directory (Core Application)
```
app/
├── page.tsx                    # Homepage (/)
├── layout.tsx                  # Root layout (wraps all pages)
├── globals.css                 # Global styles
│
├── login/
│   ├── page.tsx               # Login page (/login)
│   └── LoginForm.tsx          # Login form component
│
├── signup/
│   ├── page.tsx               # Signup page (/signup)
│   └── SignupForm.tsx         # Signup form component
│
├── dashboard/
│   ├── page.tsx               # Dashboard router (/dashboard)
│   ├── StudentDashboard.tsx   # Student view
│   └── CompanyDashboard.tsx   # Company view
│
├── api/                        # Backend API routes
│   ├── auth/                   # Authentication endpoints
│   │   ├── login/route.ts     # POST /api/auth/login
│   │   ├── signup/route.ts    # POST /api/auth/signup
│   │   ├── logout/route.ts    # POST /api/auth/logout
│   │   └── profile/route.ts   # GET /api/auth/profile
│   │
│   ├── resume/                 # Resume processing
│   │   ├── route.ts           # POST /api/resume (upload)
│   │   ├── extract-data/      # POST /api/resume/extract-data
│   │   ├── chat/              # POST /api/resume/chat
│   │   ├── finalize/          # POST /api/resume/finalize
│   │   ├── get-draft/[id]/    # GET /api/resume/get-draft/:id
│   │   └── update-draft/      # POST /api/resume/update-draft
│   │
│   └── offers/                 # Job offers
│       ├── route.ts           # GET /api/offers (list all)
│       └── [id]/route.ts      # GET /api/offers/:id (one offer)
│
└── components/
    └── Header.tsx             # Shared navigation header
```

### Components Directory
```
components/
└── ResumeChat.tsx             # Chat interface for validation
```

### Lib Directory (Utilities)
```
lib/
├── api.ts                     # Frontend API client functions
├── fieldValidation.ts         # Server-side validation logic
├── resumeSchema.ts            # Zod schemas for AI extraction
├── supabaseClient.ts          # Supabase client (browser)
├── supabaseServer.ts          # Supabase client (server)
└── types.ts                   # TypeScript type definitions
```

### Supabase Directory
```
supabase/
├── config.toml                # Supabase project config
└── migrations/                # Database migration files
    ├── 20251223083518_remote_schema.sql
    ├── 20251223124409_rajout_des_premieres_rls.sql
    └── ...                    # Other migrations
```

---

## Data Flow

### Complete Resume Upload Flow

```
1. USER UPLOADS PDF
   ↓
   StudentDashboard.tsx
   - User selects PDF file
   - handleFileUpload() called
   
2. UPLOAD TO SERVER
   ↓
   POST /api/resume (route.ts)
   - Authenticate user
   - Save PDF to Supabase Storage
   - Return file path
   
3. EXTRACT DATA
   ↓
   POST /api/resume/extract-data
   - Download PDF from storage
   - Extract text from PDF
   - Send to OpenAI GPT-4o with structured output
   - Validate all extracted fields (fieldValidation.ts)
   - Categorize: invalid / missing / uncertain
   - Save to student_profile_draft table
   - Return extracted data + validation status
   
4. START CHAT
   ↓
   ResumeChat.tsx component renders
   - Display extracted data
   - Show invalid/missing/uncertain counts
   - Initialize chat with first message
   
5. CHAT INTERACTION
   ↓
   POST /api/resume/chat (for each message)
   - Get draft from database
   - Determine completion status
   - If complete → return completion message
   - If incomplete:
     a. Get next field (priority: invalid > missing > uncertain)
     b. If first message → greet + ask first field
     c. If answer provided:
        - Hard validate answer (fieldValidation.ts)
        - If invalid → return error, ask again
        - If valid → save to draft, ask next field
   
6. FINALIZE
   ↓
   POST /api/resume/finalize
   - Verify all fields validated
   - Save to permanent tables:
     * student (profile info)
     * academic (education)
     * experience (work history)
   - Mark draft as confirmed
   - Return success
```

### Visual Data Flow Diagram

```
┌─────────────────┐
│  PDF Upload     │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│  /api/resume                            │
│  - Save to Supabase Storage             │
│  - Return file path                     │
└────────┬────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│  /api/resume/extract-data               │
│  - Extract PDF text                     │
│  - OpenAI extraction                    │
│  - Hard validation (fieldValidation.ts) │
│  - Categorize fields                    │
│  - Save to draft                        │
└────────┬────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│  ResumeChat Component                   │
│  - Display validation status            │
│  - Show chat interface                  │
└────────┬────────────────────────────────┘
         │
         ↓ (user sends message)
         │
┌─────────────────────────────────────────┐
│  /api/resume/chat                       │
│  - Get next field to ask                │
│  - Validate user answer                 │
│  - Update draft if valid                │
│  - Return next question or completion   │
└────────┬────────────────────────────────┘
         │
         ↓ (all fields valid)
         │
┌─────────────────────────────────────────┐
│  /api/resume/finalize                   │
│  - Save to student table                │
│  - Save to academic table               │
│  - Save to experience table             │
│  - Mark draft confirmed                 │
└─────────────────────────────────────────┘
```

---

## Key Components

### 1. Authentication System

**Files:**
- `app/api/auth/login/route.ts`
- `app/api/auth/signup/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/profile/route.ts`

**How it works:**
1. User signs up/logs in
2. Supabase creates auth user
3. Session stored in cookies
4. Each API request checks authentication
5. User type (student/company) stored in metadata

**Example:**
```typescript
// Check authentication in API route
const { data: { user }, error } = await supabase.auth.getUser()
if (error || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### 2. Resume Processing Pipeline

**Files:**
- `app/api/resume/route.ts` - Upload
- `app/api/resume/extract-data/route.ts` - AI extraction
- `app/api/resume/chat/route.ts` - Validation chat
- `app/api/resume/finalize/route.ts` - Save to DB
- `lib/fieldValidation.ts` - Validation rules

**Flow:**
```
Upload → Extract → Validate → Chat → Finalize
```

**Key Functions:**

`validateField(fieldName, value)` - Main validation dispatcher
```typescript
export function validateField(fieldName: string, value: any): ValidationResult {
  if (fieldName === 'phone_number') return validatePhoneNumber(value)
  if (fieldName === 'email') return validateEmail(value)
  if (fieldName.includes('date')) return validateDate(value, fieldName)
  // ...
}
```

`getNextFieldToAsk()` - Priority system
```typescript
function getNextFieldToAsk(invalid, missing, uncertain) {
  if (invalid.length > 0) return { field: invalid[0], type: 'invalid' }
  if (missing.length > 0) return { field: missing[0], type: 'missing' }
  if (uncertain.length > 0) return { field: uncertain[0], type: 'uncertain' }
  return null // All complete!
}
```

### 3. Frontend Components

**StudentDashboard.tsx**
- Main student interface
- Handles file upload
- Displays ResumeChat when data extracted

**ResumeChat.tsx**
- Chat UI for validation
- Uses `useChat` hook from @ai-sdk/react
- Displays field status (invalid/missing/uncertain)
- Auto-fetches updated draft after each message

**Component Lifecycle:**
```
1. Mount → Initialize with extractedData
2. User types message → Update input state
3. User submits → sendMessage() to /api/resume/chat
4. Response received → onFinish() callback
5. Fetch updated draft → setCurrentData()
6. Re-render with new data
```

---

## Database Architecture

### Tables and Relationships

```
┌──────────────┐
│    auth      │ (Supabase Auth)
│  - id (UUID) │
└──────┬───────┘
       │
       │ 1:1
       ↓
┌──────────────────────────┐
│       student            │
│  - id (PK, = auth.id)   │
│  - first_name           │
│  - last_name            │
│  - phone_number         │
│  - mail_adress          │
│  - address              │
└──────┬───────────────────┘
       │
       │ 1:N
       ↓
┌──────────────────────────┐
│       academic           │
│  - id (PK)              │
│  - student_id (FK)      │
│  - school_name          │
│  - degree               │
│  - starting_date        │
│  - ending_date          │
└──────────────────────────┘

┌──────────────────────────┐
│      experience          │
│  - id (PK)              │
│  - student_id (FK)      │
│  - organisation_name    │
│  - position_name        │
│  - starting_date        │
│  - ending_date          │
└──────────────────────────┘

┌──────────────────────────┐
│ student_profile_draft    │
│  - id (PK)              │
│  - student_id (FK)      │
│  - education (JSONB)    │
│  - experience (JSONB)   │
│  - extraction_confidence│
│  - status               │
└──────────────────────────┘
```

### Key Design Decisions

1. **student.id = auth.id**
   - Direct 1:1 relationship with auth user
   - No separate user_id foreign key needed
   - Simplifies queries

2. **JSONB for draft data**
   - Flexible structure during processing
   - Array of education/experience objects
   - Converted to normalized tables on finalize

3. **Three-category validation**
   - `invalid`: Failed validation
   - `missing`: Not found in resume
   - `uncertain`: Low confidence from AI
   - All stored in `extraction_confidence` JSONB

---

## Authentication Flow

### Signup Flow
```
1. User fills signup form
   ↓
2. POST /api/auth/signup
   - Create Supabase auth user
   - Set metadata: { user_type: 'student' | 'company' }
   ↓
3. Supabase creates session
   - Session stored in cookies
   ↓
4. Redirect to dashboard
```

### Login Flow
```
1. User fills login form
   ↓
2. POST /api/auth/login
   - Verify credentials with Supabase
   ↓
3. Session created
   ↓
4. Redirect to dashboard
```

### Protected Routes
```typescript
// In any API route
const supabase = await createClient() // Server-side client
const { data: { user }, error } = await supabase.auth.getUser()

if (error || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// User is authenticated, proceed...
```

---

## Resume Processing Pipeline

### Step-by-Step Breakdown

#### 1. Upload (`/api/resume/route.ts`)

**Input:** PDF file (multipart/form-data)

**Process:**
1. Authenticate user
2. Generate unique filename
3. Upload to Supabase Storage bucket `resumes`
4. Return file path

**Output:** `{ path: 'user-id/filename.pdf' }`

#### 2. Extract (`/api/resume/extract-data/route.ts`)

**Input:** `{ filePath: 'user-id/filename.pdf' }`

**Process:**
1. Download PDF from storage
2. Extract text using `pdf-parse-fork`
3. Send to OpenAI with structured output schema
4. Receive parsed JSON
5. Hard validate EVERY field:
   ```typescript
   for (const field of allFields) {
     const validation = validateField(field.name, value)
     if (!validation.isValid) {
       invalidFields.push({ ...field, error: validation.errorMessage })
     } else if (!value || value === '') {
       missingFields.push(field)
     } else if (confidence < 0.8) {
       uncertainFields.push(field)
     }
   }
   ```
6. Create draft record:
   ```typescript
   {
     student_id: user.id,
     student_name: extracted.name,
     education: [...],
     experience: [...],
     extraction_confidence: {
       invalid: [...],
       missing: [...],
       uncertain: [...]
     }
   }
   ```

**Output:** Full extracted data + categorized fields

#### 3. Chat Validation (`/api/resume/chat/route.ts`)

**Input:** `{ draftId, messages: [...] }`

**Process:**
1. Load draft from database
2. Check completion:
   ```typescript
   const isComplete = 
     invalidFields.length === 0 &&
     missingFields.length === 0 &&
     uncertainFields.length === 0
   ```
3. If complete → return completion message
4. If not complete:
   - Get next field (priority order)
   - If first message → greet
   - If user answered → validate answer:
     ```typescript
     const validation = validateField(fieldName, userAnswer)
     if (!validation.isValid) {
       return error message
     }
     // Update database
     // Remove from invalid/missing/uncertain list
     // Ask next field
     ```

**Output:** Text response (question or completion message)

#### 4. Finalize (`/api/resume/finalize/route.ts`)

**Input:** `{ draftId }`

**Process:**
1. Load draft
2. Check if student exists:
   ```typescript
   const existing = await supabase
     .from('student')
     .select('id')
     .eq('id', user.id)
     .maybeSingle()
   ```
3. Insert or update student record
4. Get student.id
5. Delete old academic/experience records
6. Insert new records with normalized dates:
   ```typescript
   academic: [{
     student_id: studentId,
     school_name: '...',
     degree: '...',
     starting_date: '2020-01-01',  // normalized
     ending_date: '2024-12-31'      // normalized
   }]
   ```
7. Mark draft as confirmed

**Output:** `{ success: true }`

---

## Security Considerations

### Server-Side Validation
- All validation happens on server
- Client can't bypass checks
- No trust in frontend data

### Vague Answer Rejection
```typescript
const vague = ['idk', 'dunno', 'none', 'n/a', 'skip', 'empty', 'unknown']
if (vague.includes(trimmed.toLowerCase())) {
  return { isValid: false, errorMessage: '...' }
}
```

### Format Validation
- Phone: 10-15 digits required
- Email: Regex + vague rejection
- Dates: Must parse to valid format
- No empty strings accepted

### RLS Policies
Supabase Row Level Security ensures:
- Students only see own data
- Companies only see own data
- No cross-user data leaks

---

## Performance Optimizations

### 1. **Lazy Loading**
Components load only when needed

### 2. **Server Components**
Default rendering on server (faster initial load)

### 3. **Database Indexes**
On frequently queried columns (student_id, etc.)

### 4. **Caching**
Static pages cached by Next.js

### 5. **Turbopack**
Fast bundler for development

---

## Testing Strategy

### Manual Testing Checklist

- [ ] Upload PDF → Extracts correctly
- [ ] Chat asks for missing fields
- [ ] Vague answers rejected
- [ ] Invalid formats rejected  
- [ ] Valid answers accepted
- [ ] Completion message shows
- [ ] Finalize saves to database
- [ ] Dashboard shows updated data

### Common Edge Cases

1. **Empty resume** → Should mark most fields as missing
2. **Malformed dates** → Should be caught and re-asked
3. **Very long text** → Should be truncated gracefully
4. **Special characters** → Should not break validation
5. **Concurrent updates** → Database handles with transactions

---

## Next Steps

Now that you understand the architecture:

1. Read the [API Reference](API_REFERENCE.md) for detailed endpoint docs
2. Check the [Database Schema](DATABASE.md) for table structures
3. Review the [Resume Validation](RESUME_VALIDATION.md) for validation logic
4. Try modifying a component to see the flow in action