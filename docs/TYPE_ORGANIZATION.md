# Type Organization Guide

## Overview
This document explains the type system organization for the Jobelix student dashboard, following professional React/TypeScript best practices and the DRY (Don't Repeat Yourself) principle.

## Type Architecture

### 📁 Shared Types (`/lib/types.ts`)
Centralized type definitions used across multiple components.

#### Resume Data Structures
```typescript
// Core data types extracted from resumes
- EducationEntry: Education history with confidence levels
- ExperienceEntry: Work experience with confidence levels
- ExtractedResumeData: Complete resume data structure
- ContactInfo: Phone and email information

// Validation types
- InvalidField: Fields with validation errors
- MissingField: Required fields not found in resume
- UncertainField: Fields that need review

// API Response types
- ExtractDataResponse: API response from resume extraction
```

#### Chat Types
```typescript
- ChatMessage: Message structure for AI chat interface
```

### 🧩 Component-Specific Props
Simple props that are specific to a single component (kept local).

#### Student Dashboard Components
```typescript
// ResumeSection.tsx
interface ResumeSectionProps {
  resumeInfo: { filename?: string; uploaded_at?: string } | null;
  uploading: boolean;
  uploadSuccess: boolean;
  uploadError: string;
  extracting: boolean;
  onFileSelect: (file: File) => void;
  onUpload: () => void;
  onDownload: () => void;
}

// DevActions.tsx
interface DevActionsProps {
  onReset: () => void;
}

// ResumeChat.tsx
interface ResumeChatProps {
  draftId: string;
  extractedData: ExtractedResumeData; // ✅ Uses shared type
  onFinalize: () => void;
}
```

#### ResumeChat Sub-Components
```typescript
// ProfileDataPanel.tsx
interface ProfileDataPanelProps {
  currentData: ExtractedResumeData; // ✅ Uses shared type
  contactInfo: ContactInfo; // ✅ Uses shared type
  needsReview: boolean;
  onFinalize: () => void;
}

// EducationItem.tsx
interface EducationItemProps {
  education: EducationEntry; // ✅ Uses shared type
}

// ExperienceItem.tsx
interface ExperienceItemProps {
  experience: ExperienceEntry; // ✅ Uses shared type
}

// ValidationStatus.tsx
interface ValidationStatusProps {
  invalidFields: InvalidField[]; // ✅ Uses shared type
  missingFields: MissingField[]; // ✅ Uses shared type
  uncertainFields: UncertainField[]; // ✅ Uses shared type
}

// ChatMessage.tsx
interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

// ChatPanel.tsx
interface ChatPanelProps {
  messages: Message[]; // Internal SDK message type
  input: string;
  status: string;
  error: Error | undefined;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}
```

## Design Decisions

### ✅ What Goes in `/lib/types.ts`?
1. **Data structures** used by multiple components
2. **API response types** (e.g., `ExtractDataResponse`)
3. **Domain models** (e.g., `EducationEntry`, `ExperienceEntry`)
4. **Shared validation types** (e.g., `InvalidField`, `MissingField`)
5. **Reusable business logic types** (e.g., `ContactInfo`)

### ❌ What Stays Local in Component Files?
1. **Component-specific props** (e.g., `ResumeSectionProps`)
2. **Simple callback signatures** (e.g., `onFileSelect: (file: File) => void`)
3. **UI state types** that only one component uses
4. **Props that are just composition** of primitives and callbacks

### 🔄 Before vs After Refactoring

#### Before (Type Duplication)
```typescript
// ResumeChat.tsx
interface ResumeChatProps {
  extractedData: {
    student_name: string | null;
    phone_number: string | null;
    email: string | null;
    // ... 50+ lines of duplicate type definition
  };
}

// ProfileDataPanel.tsx
interface ProfileDataPanelProps {
  currentData: {
    student_name: string | null;
    phone_number: string | null;
    email: string | null;
    // ... 50+ lines of SAME type definition
  };
}
```

#### After (DRY Principle)
```typescript
// lib/types.ts
export interface ExtractedResumeData {
  student_name: string | null;
  phone_number: string | null;
  email: string | null;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  // ... single source of truth
}

// ResumeChat.tsx
interface ResumeChatProps {
  extractedData: ExtractedResumeData; // ✅ Reuses shared type
}

// ProfileDataPanel.tsx
interface ProfileDataPanelProps {
  currentData: ExtractedResumeData; // ✅ Reuses shared type
}
```

## Benefits

### 1. **Single Source of Truth**
- Type definitions exist in one place
- Changes propagate automatically
- No risk of inconsistencies

### 2. **Type Safety**
- TypeScript catches mismatches at compile time
- IDE autocomplete works across all components
- Refactoring is safer with type checking

### 3. **Maintainability**
- Easy to find and update types
- Clear separation: shared vs component-specific
- Professional codebase structure

### 4. **Developer Experience**
- Less code duplication (425 lines → 160 lines in ResumeChat)
- Better IDE support with imports
- Easier onboarding for new developers

## Import Patterns

### Shared Types
```typescript
import { 
  ExtractedResumeData, 
  EducationEntry, 
  ExperienceEntry,
  ContactInfo 
} from '@/lib/types';
```

### Component Props (Local)
```typescript
// Defined directly in component file
interface MyComponentProps {
  onClick: () => void;
  title: string;
}
```

## Verification

All student dashboard components have been audited and refactored:
- ✅ No TypeScript errors
- ✅ No type duplication
- ✅ Proper separation of shared vs local types
- ✅ Professional folder structure with sub-components
- ✅ Follows React/TypeScript best practices

## Files Modified

### Type Definitions
- `lib/types.ts` - Added shared resume and chat types

### Components Refactored
- `app/dashboard/student/components/ResumeChat.tsx`
- `app/dashboard/student/components/ResumeChat/ProfileDataPanel.tsx`
- `app/dashboard/student/components/ResumeChat/EducationItem.tsx`
- `app/dashboard/student/components/ResumeChat/ExperienceItem.tsx`
- `app/dashboard/student/components/ResumeChat/ValidationStatus.tsx`
- `app/dashboard/student/components/ResumeChat/ChatPanel.tsx`

### Components Already Using Shared Types
- `app/dashboard/student/StudentDashboard.tsx` (uses `ExtractDataResponse`)

## Next Steps

When adding new components:
1. **Check first** if type exists in `lib/types.ts`
2. **Reuse** existing types when possible
3. **Add to** `lib/types.ts` if type will be shared
4. **Keep local** if type is component-specific props
5. **Document** major type additions in this guide

---

**Last Updated:** 2025-01-28  
**Status:** ✅ All student dashboard components audited and refactored
