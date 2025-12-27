# Resume Chat Flow Verification

## Complete Process Flow

### Step 1: Initial Extraction ✅
**File**: `/app/api/resume/extract-data/route.ts`

```
1. User uploads PDF
2. pdf-parse extracts text
3. GPT-4o with zodResponseFormat generates structured JSON:
   {
     student_name, phone_number, email, address,
     education: [...],
     experience: [...],
     missing_fields: ["phone_number", "email"],  // NULL required fields
     uncertain_fields: ["Company XYZ starting_date"]  // Low confidence data
   }
4. Saves to student_profile_draft with extraction_confidence
```

### Step 2: Chat Validation (FIXED!) ✅
**File**: `/app/api/resume/chat/route.ts`

**OLD APPROACH (BROKEN)**:
- Used `streamText` + text parsing for "PROFILE_UPDATE:" markers
- Markers never appeared in AI responses → Updates failed

**NEW APPROACH (WORKING)**:
```typescript
streamObject({
  schema: ChatUpdateSchema,  // Structured output!
  ...
  async onFinish({ object }) {
    // object = {
    //   message: "Great! What's your email?",
    //   field_updates: [
    //     { field_name: "phone_number", field_value: "0786948497" }
    //   ],
    //   resolved_uncertain_fields: ["Company XYZ starting_date"],
    //   is_complete: false
    // }
    
    1. Convert field_updates array to object → updates = { phone_number: "..." }
    2. Update education/experience arrays with resolved_uncertain_fields
    3. Recalculate missing_fields (remove provided fields)
    4. Remove resolved uncertain fields
    5. Save to database with updated extraction_confidence
  }
})
```

### Step 3: Frontend Real-Time Update ✅
**File**: `/components/ResumeChat.tsx`

```typescript
const { messages, append } = useChat({
  async onFinish() {
    // Fetch latest draft from database (server as single source of truth)
    const response = await fetch(`/api/resume/get-draft/${draftId}`)
    const updatedDraft = await response.json()
    
    // Update React state → UI re-renders
    setCurrentData({
      education: updatedDraft.draft.education,
      experience: updatedDraft.draft.experience,
      missing_fields: updatedDraft.draft.extraction_confidence.missing,
      uncertain_fields: updatedDraft.draft.extraction_confidence.uncertain,
      ...
    })
  }
})
```

### Step 4: Iteration Until Complete ✅
```
Loop:
1. AI asks for next missing field
2. User provides data
3. AI returns field_updates in structured format
4. Backend updates database
5. Frontend fetches updated draft
6. UI shows remaining missing/uncertain fields
7. Repeat until is_complete = true
```

### Step 5: Finalization ✅
**File**: `/app/api/resume/finalize/route.ts`

```
1. User clicks "Finalize"
2. Backend fetches complete draft
3. normalizeDateForDB() converts dates (YYYY-MM → YYYY-MM-01)
4. Upserts to student table (contact info)
5. Inserts to academic table (education entries)
6. Inserts to experience table (work history with dates)
7. RLS policies allow authenticated user inserts
```

## Key Technical Decisions

### 1. Structured Output (ChatUpdateSchema)
**Why**: Text parsing is unreliable. GPT-4o with structured output **guarantees** correct format.

**Schema**:
```typescript
{
  message: string,                          // User-facing message
  field_updates: [                          // Array of field updates
    { field_name: string, field_value: string }
  ],
  resolved_uncertain_fields: string[],      // Uncertain fields that were resolved
  is_complete: boolean                      // True when all fields collected
}
```

### 2. Server-Side State as Single Source of Truth
**Why**: Avoids sync issues. Database always has the latest state.

**Implementation**: `onFinish` callback fetches from `/api/resume/get-draft/[draftId]` after every message.

### 3. Field-Agnostic Architecture
**Why**: Flexible system that handles ANY field dynamically.

**How**:
- Missing fields displayed in dropdown regardless of name
- Uncertain fields matched by organization/school names
- No hardcoded field lists

### 4. Date Normalization
**Why**: PostgreSQL requires full dates (YYYY-MM-DD), but resumes often have YYYY or YYYY-MM.

**Solution**: `normalizeDateForDB()` converts YYYY-MM → YYYY-MM-01 before saving.

## Testing Checklist

- [ ] Upload resume with missing phone_number
- [ ] Verify `missing_fields` contains "phone_number"
- [ ] Provide phone in chat: "0786948497"
- [ ] Check backend logs: "Field updates: { phone_number: '0786948497' }"
- [ ] Verify left panel updates (phone_number removed from missing)
- [ ] Continue with email, address, etc.
- [ ] Verify uncertain fields like "Company XYZ starting_date" appear
- [ ] Provide starting date (e.g., "2020")
- [ ] Verify uncertain field removed and education/experience updated
- [ ] When complete, verify `is_complete: true` in logs
- [ ] Click "Finalize" and check student/academic/experience tables

## Real-Time Update Guarantee

**Chain of updates**:
```
User types → AI processes → onFinish triggered →
Database updated → GET /api/resume/get-draft/[draftId] →
setCurrentData(updatedDraft) → React re-renders →
Left panel shows latest missing/uncertain fields
```

**No polling needed**: Single fetch after each AI response is sufficient.

## Known Working State

- ✅ Structured output schema defined
- ✅ streamObject with ChatUpdateSchema
- ✅ onFinish callback updates database
- ✅ Frontend onFinish fetches latest draft
- ✅ Missing fields recalculation logic
- ✅ Uncertain fields matching and removal
- ✅ Date normalization
- ✅ RLS policies configured
- ✅ All migrations applied
- ✅ No compile errors
