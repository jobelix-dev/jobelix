# Resume YAML Generation Implementation

## Overview
Client-side system that automatically generates a `resume.yaml` file in the local Electron app data folder whenever a student publishes their profile.

## Architecture

### 1. IPC Layer (Electron Main Process)
**File**: `main.js`
- Added `write-resume` IPC handler
- Saves YAML content to: `resources/linux/main/data_folder/resume.yaml`
- Creates directory if it doesn't exist
- Returns success/error status

### 2. Preload Bridge
**File**: `preload.js`
- Exposed `writeResumeFile(content)` method to renderer process
- Invokes `write-resume` IPC handler

### 3. TypeScript Declarations
**File**: `lib/electronAPI.d.ts`
- Added type definition for `writeResumeFile` method
- Returns: `Promise<{ success: boolean; path?: string; error?: string }>`

### 4. API Route
**File**: `app/api/student/profile/published/route.ts`
- Fetches complete published profile data from database
- Joins all related tables: student, academic, experience, project, skill, language, certification, social_link
- Returns structured JSON with all profile information

### 5. YAML Generator
**File**: `lib/resumeYamlGenerator.ts`
- Transforms database schema to YAML format
- Extracts usernames from social link URLs (GitHub, LinkedIn, StackOverflow, Kaggle, LeetCode)
- Formats dates as YYYY-MM-DD
- Handles missing data by omitting fields
- Converts descriptions to YAML text blocks
- Combines all skills into "General" section
- Formats languages as "Name: Level"

### 6. Trigger Integration
**File**: `app/dashboard/student/page.tsx`
- Modified `handleFinalize()` function
- After successful profile finalization:
  1. Fetches published profile data from API
  2. Generates YAML content
  3. Writes to local file via Electron IPC
  4. Logs success/error (non-blocking)

## Data Transformations

### Social Links → Usernames
- **GitHub**: `github.com/{username}` → `GitHub: username`
- **LinkedIn**: `linkedin.com/in/{username}` → `LinkedIn: username`
- **StackOverflow**: `stackoverflow.com/users/ID/{username}` → `StackOverflow: username`
- **Kaggle**: `kaggle.com/{username}` → `Kaggle: username`
- **LeetCode**: `leetcode.com/{username}` or `leetcode.com/u/{username}` → `LeetCode: username`

### Database Fields → YAML Structure
```
student.student_name → name
student.mail_adress → contact[0]
student.phone_number → contact[1]
student.address → contact[2]

academic → education (school_name → institution, degree → degree)
experience → experience (organisation_name → company, position_name → position)
project → projects (project_name → name, description → highlights)
skill → skills (all → General section)
language → languages (language_name: proficiency_level)
certification → certifications (name, url)
```

### Date Formatting
- Input: ISO 8601 date strings from database
- Output: `YYYY-MM-DD` format
- Missing dates: Entire date lines omitted

### Text Blocks
- Single-line descriptions: Inline strings (quoted if special characters)
- Multi-line descriptions: YAML literal block style (`|`) with indentation

## File Location
**Development**: `<project-root>/resources/linux/main/data_folder/resume.yaml`
**Production**: `<electron-resources>/linux/main/data_folder/resume.yaml`

## Error Handling
- YAML generation errors don't block profile finalization
- Errors logged to console
- Main profile save flow continues even if YAML fails
- IPC returns error messages for debugging

## Future Enhancements
- Platform detection (currently hardcoded to Linux)
- User notification when YAML saved
- Export YAML button in UI
- YAML validation before saving
