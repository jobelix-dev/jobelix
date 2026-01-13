# Lib Folder Refactoring

## Overview
Refactored the `lib/` folder to enforce clear separation between client-side, server-side, and shared code with proper "server-only" imports.

## New Structure

```
lib/
├── client/           # Client-side only code
│   ├── api.ts                    # Client API wrapper functions
│   ├── supabaseClient.ts         # Browser Supabase client
│   ├── profileValidation.ts      # Client-side validation
│   ├── yamlConverter.ts          # YAML conversion utilities
│   ├── resumeYamlGenerator.ts    # Resume YAML generator
│   └── electronAPI.d.ts          # Electron API type definitions
│
├── server/           # Server-side only code (all have "server-only" import)
│   ├── auth.ts                   # API authentication utilities
│   ├── supabaseServer.ts         # Server Supabase client (cookies)
│   ├── supabaseService.ts        # Service role Supabase client (RLS bypass)
│   ├── rateLimiting.ts           # Rate limiting utilities
│   ├── draftMappers.ts           # Draft to DB mapping functions
│   ├── fieldValidation.ts        # Server-side field validation
│   ├── emailTemplates.ts         # Email template generators
│   ├── github-api.ts             # GitHub API utilities
│   └── resumeSchema.ts           # Zod schemas for resume extraction
│
└── shared/           # Shared types and utilities
    └── types.ts                  # TypeScript type definitions
```

## Changes Made

### 1. Added "server-only" Imports
All 9 server-side files now start with:
```typescript
import "server-only";
```

This prevents accidental bundling of server code in client bundles.

### 2. Updated Import Paths

**Client imports:**
- `@/lib/api` → `@/lib/client/api`
- `@/lib/supabaseClient` → `@/lib/client/supabaseClient`
- `@/lib/profileValidation` → `@/lib/client/profileValidation`
- `@/lib/yamlConverter` → `@/lib/client/yamlConverter`
- `@/lib/resumeYamlGenerator` → `@/lib/client/resumeYamlGenerator`

**Server imports:**
- `@/lib/auth` → `@/lib/server/auth`
- `@/lib/supabaseServer` → `@/lib/server/supabaseServer`
- `@/lib/supabaseService` → `@/lib/server/supabaseService`
- `@/lib/rateLimiting` → `@/lib/server/rateLimiting`
- `@/lib/draftMappers` → `@/lib/server/draftMappers`
- `@/lib/fieldValidation` → `@/lib/server/fieldValidation`
- `@/lib/emailTemplates` → `@/lib/server/emailTemplates`
- `@/lib/github-api` → `@/lib/server/github-api`
- `@/lib/resumeSchema` → `@/lib/server/resumeSchema`

**Shared imports:**
- `@/lib/types` → `@/lib/shared/types`

### 3. Cross-references Updated
- `lib/client/api.ts` now imports from `../shared/types`
- `lib/client/profileValidation.ts` now imports from `../shared/types`
- `lib/server/draftMappers.ts` now imports from `../shared/types`

## Benefits

1. **Type Safety**: Server-only code cannot be accidentally imported in client components
2. **Bundle Size**: Client bundles won't include server-side dependencies
3. **Security**: Clear separation prevents leaking server secrets to client
4. **Maintainability**: Easy to identify where code should run
5. **Developer Experience**: Import errors caught at build time, not runtime

## Verification

All imports have been automatically updated across:
- 61 files in `app/` directory
- All API routes
- All client components
- All server components

No compilation errors after refactoring.

## Dependencies Added

- `server-only` package (ensures server code stays server-side)

## Usage Guidelines

### For Client Code
```typescript
// ✅ Correct - client imports
import { api } from '@/lib/client/api'
import type { UserProfile } from '@/lib/shared/types'
import { validateProfile } from '@/lib/client/profileValidation'

// ❌ Wrong - will cause build error
import { authenticateRequest } from '@/lib/server/auth' // Error: server-only!
```

### For Server Code (API Routes, Server Components)
```typescript
// ✅ Correct - server imports
import { authenticateRequest } from '@/lib/server/auth'
import { createClient } from '@/lib/server/supabaseServer'
import type { UserProfile } from '@/lib/shared/types'

// ✅ Also correct - shared types work everywhere
import type { ExtractedResumeData } from '@/lib/shared/types'
```

### For Shared Types
```typescript
// ✅ Use shared types in both client and server
import type { UserProfile, ExtractedResumeData } from '@/lib/shared/types'
```

## Migration Checklist

- [x] Created `lib/client/`, `lib/server/`, `lib/shared/` directories
- [x] Moved files to appropriate directories
- [x] Added "server-only" imports to all server files
- [x] Updated internal cross-references between lib files
- [x] Updated all imports in `app/` directory (61 files)
- [x] Installed `server-only` package
- [x] Verified no compilation errors
- [x] Documented changes

## Notes

- All server files now have `import "server-only"` as the first import
- Type definitions (`types.ts`) are in `shared/` since they're used everywhere
- Client components use `client/` imports only
- API routes and server components use `server/` imports
- The `electronAPI.d.ts` file is in `client/` since it's used in renderer process
