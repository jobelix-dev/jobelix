# Resume Validation System

This document explains how the resume validation system works in Jobelix, including the AI extraction process, validation logic, and security measures.

## Overview

The validation system is designed to be **secure, accurate, and user-friendly**. It uses a combination of AI extraction and hard server-side validation to ensure data quality while preventing bypass attempts.

## Table of Contents
1. [Three-Category Validation](#three-category-validation)
2. [Validation Flow](#validation-flow)
3. [Field Validation Rules](#field-validation-rules)
4. [Security Measures](#security-measures)
5. [Chat Interaction Logic](#chat-interaction-logic)
6. [Date Normalization](#date-normalization)

---

## Three-Category Validation

After AI extraction, every field is categorized into one of three lists:

### 1. Invalid Fields
Fields that **failed validation** due to:
- Wrong format (e.g., "abc" for phone number)
- Vague responses (e.g., "idk", "none", "skip")
- Too short/long
- Invalid characters

**Example:**
```json
{
  "field_path": "phone_number",
  "display_name": "phone number",
  "error": "Phone number must contain at least 10 digits"
}
```

### 2. Missing Fields
Fields that were **not found** in the resume or are empty.

**Example:**
```json
{
  "field_path": "address",
  "display_name": "address"
}
```

### 3. Uncertain Fields  
Fields extracted with **low confidence** (< 80%) from the AI.

**Example:**
```json
{
  "field_path": "experience.0.ending_date",
  "display_name": "Arteris IP - ending date",
  "context": "Arteris IP"
}
```

---

## Validation Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. PDF Upload                                           │
│    User uploads resume.pdf                              │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 2. AI Extraction (GPT-4o)                               │
│    - Extract text from PDF                              │
│    - Parse with structured output                       │
│    - Returns JSON with all fields                       │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Hard Validation (Server-Side)                        │
│    FOR EACH FIELD:                                      │
│      validation = validateField(fieldName, value)       │
│                                                          │
│      IF validation.isValid == false:                    │
│        → Add to invalidFields[]                         │
│                                                          │
│      ELSE IF value is empty:                            │
│        → Add to missingFields[]                         │
│                                                          │
│      ELSE IF confidence < 0.8:                          │
│        → Add to uncertainFields[]                       │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Store in Draft                                       │
│    extraction_confidence: {                             │
│      invalid: [...],                                    │
│      missing: [...],                                    │
│      uncertain: [...]                                   │
│    }                                                     │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Chat Interaction                                     │
│    WHILE (invalid + missing + uncertain > 0):           │
│                                                          │
│      next = getNextField() // Priority order            │
│                                                          │
│      IF invalid:                                        │
│        Ask: "The {field} you provided is invalid        │
│             because {error}. Can you provide it again?" │
│                                                          │
│      ELSE IF missing:                                   │
│        Ask: "Could you provide your {field}?"           │
│                                                          │
│      ELSE IF uncertain:                                 │
│        Ask: "I found {value} for {field}.               │
│             Can you confirm or correct this?"           │
│                                                          │
│      user_answer = waitForAnswer()                      │
│      validation = validateField(field, user_answer)     │
│                                                          │
│      IF validation.isValid:                             │
│        - Update database                                │
│        - Remove from list                               │
│        - Ask next field                                 │
│      ELSE:                                              │
│        - Show error                                     │
│        - Ask same field again                           │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Completion Check                                     │
│    IF all lists empty:                                  │
│      → Show "Profile complete!" message                 │
│      → Enable "Finalize" button                         │
└─────────────────────────────────────────────────────────┘
```

---

## Field Validation Rules

All validation logic is in `lib/fieldValidation.ts`. Each field type has specific rules.

### Phone Number

**Function:** `validatePhoneNumber(value)`

**Rules:**
1. Must not be vague ("idk", "none", "skip", etc.)
2. Must contain 10-15 digits (ignores spaces, dashes, parentheses)
3. Can have country code or area code formatting

**Examples:**
```typescript
"123-456-7890"        ✅ Valid (10 digits)
"+1 (555) 123-4567"   ✅ Valid (10 digits)
"06 12 34 56 78"      ✅ Valid (10 digits, French format)
"12345"               ❌ Invalid (too short)
"idk"                 ❌ Invalid (vague)
"none"                ❌ Invalid (vague)
```

**Code:**
```typescript
export function validatePhoneNumber(value: string | null | undefined): ValidationResult {
  if (!value) {
    return { isValid: false, errorMessage: 'Phone number is required' }
  }

  const trimmed = value.trim()
  
  // Vague response check
  const vague = ['idk', 'dunno', 'none', 'n/a', 'skip', 'empty', 'unknown', 'not sure']
  if (vague.includes(trimmed.toLowerCase())) {
    return { 
      isValid: false, 
      errorMessage: 'Please provide a valid phone number or type "skip" if you prefer not to provide one' 
    }
  }

  // Extract digits only
  const digitsOnly = trimmed.replace(/\D/g, '')
  
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return { isValid: false, errorMessage: 'Phone number must contain at least 10 digits' }
  }

  return { isValid: true, normalizedValue: trimmed }
}
```

### Email

**Function:** `validateEmail(value)`

**Rules:**
1. Must not be vague
2. Must match email regex pattern
3. Must have @ and domain

**Examples:**
```typescript
"john@example.com"    ✅ Valid
"jane.doe@uni.fr"     ✅ Valid
"idk"                 ❌ Invalid (vague)
"notanemail"          ❌ Invalid (no @)
"test@"               ❌ Invalid (no domain)
```

**Code:**
```typescript
export function validateEmail(value: string | null | undefined): ValidationResult {
  if (!value) {
    return { isValid: false, errorMessage: 'Email is required' }
  }

  const trimmed = value.trim()
  
  // Vague response check
  const vague = ['idk', 'dunno', 'none', 'n/a', 'skip', 'empty', 'unknown']
  if (vague.includes(trimmed.toLowerCase())) {
    return { isValid: false, errorMessage: 'Please provide a valid email address' }
  }

  // Email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, errorMessage: 'Please provide a valid email address' }
  }

  return { isValid: true, normalizedValue: trimmed.toLowerCase() }
}
```

### Address

**Function:** `validateAddress(value)`

**Rules:**
1. Must not be vague
2. Must be at least 3 characters

**Examples:**
```typescript
"123 Main St, Paris"  ✅ Valid
"London, UK"          ✅ Valid
"Paris"               ✅ Valid
"idk"                 ❌ Invalid (vague)
"ab"                  ❌ Invalid (too short)
```

### Dates

**Function:** `validateDate(value, fieldName)`

**Rules:**
1. Must not be vague ("recently", "last year")
2. Must be parseable to YYYY, YYYY-MM, or YYYY-MM-DD
3. Accepts "Present", "Current", "Now" for ending dates
4. Converts month names: "May 2020" → "2020-05"

**Examples:**
```typescript
"2020"                ✅ Valid → "2020"
"2020-05"             ✅ Valid → "2020-05"
"2020-05-15"          ✅ Valid → "2020-05-15"
"May 2020"            ✅ Valid → "2020-05"
"September 15, 2023"  ✅ Valid → "2023-09-15"
"Present"             ✅ Valid (ending date) → null
"Current"             ✅ Valid (ending date) → null
"recently"            ❌ Invalid (vague)
"last year"           ❌ Invalid (vague)
"idk"                 ❌ Invalid (vague)
```

**Code:**
```typescript
export function validateDate(value: string | null | undefined, fieldName: string): ValidationResult {
  if (!value) {
    return { isValid: false, errorMessage: 'Date is required' }
  }

  const trimmed = value.trim()
  
  // Check if it's an ending date that can be null (Present/Current)
  const isEndingDate = fieldName.includes('ending_date')
  if (isEndingDate && ['present', 'current', 'now', 'ongoing'].includes(trimmed.toLowerCase())) {
    return { isValid: true, normalizedValue: null }
  }

  // Vague responses
  const vague = ['idk', 'dunno', 'none', 'n/a', 'skip', 'recently', 'last year', 'few years ago']
  if (vague.includes(trimmed.toLowerCase())) {
    return { isValid: false, errorMessage: 'Please provide a specific date (e.g., 2020, May 2020, or 2020-05-15)' }
  }

  // Try to parse the date
  const normalized = normalizeDate(trimmed)
  if (!normalized) {
    return { 
      isValid: false, 
      errorMessage: 'Please provide date in format: YYYY, Month YYYY, or YYYY-MM-DD' 
    }
  }

  return { isValid: true, normalizedValue: normalized }
}

function normalizeDate(dateStr: string): string | null {
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  
  // Try YYYY-MM
  if (/^\d{4}-\d{2}$/.test(dateStr)) return dateStr
  
  // Try YYYY
  if (/^\d{4}$/.test(dateStr)) return dateStr
  
  // Try "Month YYYY" or "Month DD, YYYY"
  const monthNames = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12'
  }
  
  const lowerDate = dateStr.toLowerCase()
  for (const [month, num] of Object.entries(monthNames)) {
    if (lowerDate.includes(month)) {
      const yearMatch = dateStr.match(/\d{4}/)
      const dayMatch = dateStr.match(/\d{1,2}(?=,)/)
      
      if (yearMatch) {
        const year = yearMatch[0]
        if (dayMatch) {
          return `${year}-${num}-${dayMatch[0].padStart(2, '0')}`
        }
        return `${year}-${num}`
      }
    }
  }
  
  return null
}
```

### Text Fields (Position, Organization, School, Degree)

**Function:** `validateTextField(value, fieldName)`

**Rules:**
1. Must not be vague
2. Must be at least 2 characters

**Examples:**
```typescript
"Software Engineer"   ✅ Valid
"Google"              ✅ Valid
"Bachelor"            ✅ Valid
"idk"                 ❌ Invalid (vague)
"a"                   ❌ Invalid (too short)
```

---

## Security Measures

### 1. Server-Side Only Validation

**All validation happens on the server.** The client cannot bypass checks.

```typescript
// ❌ WRONG - Client-side validation (can be bypassed)
// components/ResumeChat.tsx
if (userInput.length < 10) {
  alert("Too short!")
  return
}

// ✅ CORRECT - Server-side validation (secure)
// app/api/resume/chat/route.ts
const validation = validateField(fieldName, userAnswer)
if (!validation.isValid) {
  return new Response(validation.errorMessage)
}
```

### 2. Vague Answer Rejection

A comprehensive list of vague responses is rejected:

```typescript
const vague = [
  'idk', 'dunno', 'none', 'n/a', 'skip', 'empty', 'unknown',
  'not sure', 'dont know', 'no idea', 'nothing', 'nil',
  'recently', 'last year', 'few years ago', 'a while ago'
]
```

This prevents users from gaming the system with non-answers.

### 3. Format Validation

Each field type has strict format requirements:
- Phone: Must have 10-15 digits
- Email: Must match regex
- Dates: Must parse to valid format
- No empty strings accepted

### 4. Immutable Validation Logic

The validation logic is in a separate utility file (`lib/fieldValidation.ts`) that cannot be modified by the frontend.

### 5. Double Validation

Fields are validated **twice**:
1. During extraction (AI output validation)
2. During chat (user answer validation)

This ensures consistency and prevents drift.

---

## Chat Interaction Logic

### Priority System

Fields are asked in this order:
1. **Invalid fields** (highest priority - need correction)
2. **Missing fields** (medium priority - not found)
3. **Uncertain fields** (lowest priority - just confirmation)

**Code:**
```typescript
function getNextFieldToAsk(invalidFields, missingFields, uncertainFields) {
  if (invalidFields.length > 0) {
    return { field: invalidFields[0], type: 'invalid' }
  }
  if (missingFields.length > 0) {
    return { field: missingFields[0], type: 'missing' }
  }
  if (uncertainFields.length > 0) {
    return { field: uncertainFields[0], type: 'uncertain' }
  }
  return null // All done!
}
```

### Message Templates

Different messages for different situations:

**Invalid Field:**
```
"I see you provided '{value}' for {field}, but {error_message}. 
Could you provide it again?"
```

**Missing Field:**
```
"Could you please provide your {field}?"
```

**Uncertain Field:**
```
"I found '{value}' for {field}. Can you confirm this is correct 
or provide the right value?"
```

**Completion:**
```
"Perfect! Your profile is complete. You can now click the 
'Finalize Profile' button to save everything."
```

### Answer Validation Loop

```typescript
// User provides answer
const userAnswer = extractAnswerFromMessage()

// Validate
const validation = validateField(currentField.field_path, userAnswer)

if (!validation.isValid) {
  // Invalid - ask again with error
  return new Response(validation.errorMessage)
}

// Valid - save and continue
await updateDraftInDatabase(currentField.field_path, validation.normalizedValue)
await removeFromValidationList(currentField)

const nextField = getNextFieldToAsk()
if (!nextField) {
  return new Response("Perfect! Your profile is complete...")
}

return new Response(`Great! Now, ${askAboutField(nextField)}`)
```

---

## Date Normalization

Dates are normalized at two stages:

### 1. During Chat (User Answer)

Convert to standard format:
- "2020" → "2020"
- "May 2020" → "2020-05"
- "September 15, 2023" → "2023-09-15"
- "Present" → `null`

### 2. During Finalize (Database Insert)

Convert to full PostgreSQL date format:

**Starting Dates** (use beginning of period):
- "2020" → "2020-01-01"
- "2020-05" → "2020-05-01"
- "2020-05-15" → "2020-05-15"

**Ending Dates** (use end of period):
- "2025" → "2025-12-31"
- "2025-05" → "2025-05-31"
- "2025-05-15" → "2025-05-15"
- `null` → `null` (ongoing)

**Code:**
```typescript
function normalizeDateForDB(dateStr: string | null, isEndDate: boolean): string | null {
  if (!dateStr) return null
  
  // Already full date
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  
  // Year-Month → add day
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    if (isEndDate) {
      const [year, month] = dateStr.split('-').map(Number)
      const lastDay = new Date(year, month, 0).getDate()
      return `${dateStr}-${String(lastDay).padStart(2, '0')}`
    }
    return `${dateStr}-01`
  }
  
  // Year only → add month and day
  if (/^\d{4}$/.test(dateStr)) {
    return isEndDate ? `${dateStr}-12-31` : `${dateStr}-01-01`
  }
  
  return null
}
```

This ensures:
- Database constraints are satisfied (ending_date >= starting_date)
- Date ranges are accurate
- No invalid date formats in database

---

## Edge Cases Handled

### 1. Empty Resume
All fields marked as missing → Chat asks for everything

### 2. Partial Resume
Mix of extracted and missing fields → Chat asks only for missing

### 3. Malformed Data
Invalid formats caught during extraction → Added to invalid list

### 4. Vague Answers
User types "idk" or "skip" → Rejected, asked again

### 5. Concurrent Updates
Database transactions prevent race conditions

### 6. Special Characters
Handled gracefully in all text fields

### 7. Very Long Input
Validated and truncated if necessary

---

## Testing the Validation

### Manual Test Cases

1. **Test vague answers:**
   - Upload resume
   - When asked for phone, type "idk"
   - Should see error and re-ask

2. **Test invalid format:**
   - Type "123" for phone number
   - Should see "must contain at least 10 digits"

3. **Test valid answer:**
   - Type "123-456-7890"
   - Should accept and ask next field

4. **Test date formats:**
   - "2020" → accepted
   - "May 2020" → accepted
   - "recently" → rejected

5. **Test completion:**
   - Answer all fields correctly
   - Should see completion message
   - Finalize button should be enabled

---

## Future Improvements

### Potential Enhancements

1. **Fuzzy Matching**
   - "Googl" → suggest "Google"
   - "Softwar Engineer" → suggest "Software Engineer"

2. **Smart Defaults**
   - If degree is "Bachelor", suggest common majors

3. **Context-Aware Validation**
   - If organization is "Google", validate position makes sense

4. **Learning from Corrections**
   - Track common errors and improve prompts

5. **Multi-Language Support**
   - Validate dates in different formats
   - Accept addresses in various languages

---

## Related Documentation

- [Architecture](ARCHITECTURE.md) - Overall system design
- [API Reference](API_REFERENCE.md) - Endpoint details
- [Database Schema](DATABASE.md) - Table structures
- [Beginner's Guide](BEGINNERS_GUIDE.md) - Getting started
