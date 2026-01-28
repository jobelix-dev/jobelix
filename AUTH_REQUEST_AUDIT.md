# Auth Request Audit - 200+ requests/min Issue

## Problem
Seeing 200+ `/auth/v1/user` requests per minute when testing bot, all with:
- User-Agent: `node`
- Client: `supabase-ssr/0.8.0 createServerClient`
- Source: Server-side Next.js API routes

## Root Cause Analysis

### 1. **Bot Polling Creates Request Storm** ⚠️ CRITICAL
**File:** `app/dashboard/student/features/auto-apply/hooks/useBotStatus.ts`
- Polls `/api/autoapply/bot/status` every 2 seconds (POLLING_INTERVAL_MS = 2000)
- Each poll → `authenticateRequest()` → `getUser()` call
- **30 requests/min from polling alone**

### 2. **Every API Route Calls authenticateRequest()**
**Pattern:** Every protected endpoint does:
```typescript
const auth = await authenticateRequest(); // → getUser()
if (auth.error) return auth.error;
```

**High-frequency endpoints:**
- `/api/autoapply/bot/status` - polled every 2s during bot operation
- `/api/student/credits/balance` - checked frequently
- `/api/student/profile/draft` - accessed on tab switches
- `/api/oauth/github/status` - polled when OAuth popup open

### 3. **Profile API Called Frequently**
**File:** `app/api/auth/profile/route.ts`
- Called on dashboard mount
- Called on tab switches
- No caching, fresh `getUser()` every time

### 4. **GitHub OAuth Status Polling**
**File:** `app/dashboard/student/hooks/useGitHubConnection.ts`
- When OAuth popup is open, polls every 500ms to check if closed
- Each poll eventually hits `/api/oauth/github/status` → `getUser()`

### 5. **Multiple Simultaneous Fetches on Page Load**
**Dashboard mount triggers:**
- `/api/auth/profile` - check user role
- `/api/student/profile/draft` - get profile data
- `/api/student/profile/published` - check published status
- `/api/student/work-preferences` - get preferences
- `/api/student/credits/balance` - get credits
- `/api/student/credits/can-claim` - check claimable
- `/api/autoapply/bot/status` - check bot status
- `/api/oauth/github/status` - check GitHub connection

**Each of these calls `authenticateRequest()` → `getUser()`**

## Request Math

**Bot running scenario:**
- Bot status polling: 30 req/min
- Credits balance checks: ~10 req/min
- Profile/preferences checks: ~5 req/min
- GitHub status checks: ~5 req/min (if connected)
- Random UI interactions: ~10 req/min
- **Total: 60+ req/min minimum**

**With multiple tabs or hot reload:**
- Multiply by number of tabs
- HMR can trigger re-mounts → duplicate fetches
- **200+ req/min easily reached**

## Solutions

### Immediate Fixes

#### 1. **Add Response Caching** ⭐ HIGHEST IMPACT
```typescript
// lib/server/auth.ts
const userCache = new Map<string, { user: User; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

export async function authenticateRequest(): Promise<AuthResult> {
  const supabase = await createClient();
  
  // Try to get session token from cookies for cache key
  const sessionToken = getCookieValue('sb-access-token');
  
  if (sessionToken) {
    const cached = userCache.get(sessionToken);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { user: cached.user, supabase, error: null };
    }
  }
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (user && sessionToken) {
    userCache.set(sessionToken, { user, timestamp: Date.now() });
  }
  
  // ... rest
}
```

#### 2. **Reduce Bot Status Polling Frequency**
```typescript
// lib/bot-status/constants.ts
export const POLLING_INTERVAL_MS = 5_000; // 2s → 5s (30 req/min → 12 req/min)
```

#### 3. **Use Supabase Realtime Instead of Polling**
✅ Already implemented for bot status, but fallback to polling is aggressive
- Remove fallback polling entirely (Realtime should work)
- Or increase fallback interval to 10s

#### 4. **Batch API Calls on Dashboard Mount**
Create single endpoint: `/api/student/dashboard-data`
```typescript
// Returns all data in one call:
{
  profile, credits, preferences, botStatus, githubStatus
}
```
**Impact:** 7 requests → 1 request = 85% reduction

#### 5. **Client-Side Request Deduplication**
```typescript
// Use React Query or SWR with deduplication
const { data } = useQuery('botStatus', fetchBotStatus, {
  staleTime: 2000,
  dedupingInterval: 1000,
});
```

### Medium Priority

#### 6. **Add Request Rate Limiting**
Already have rate limiting in `proxy.ts`, but:
- Current: 100 req/min per IP for auth endpoints
- Consider: 50 req/min for `/auth/v1/user`

#### 7. **Lazy Load Heavy Checks**
- Don't check GitHub status unless user opens Profile tab
- Don't check bot status unless user opens Auto-Apply tab

#### 8. **Use Middleware for Auth Instead of Per-Route**
- Cache user in middleware (Next.js 14)
- Attach to request context
- Routes read from context instead of calling `getUser()`

### Low Priority

#### 9. **Add Client-Side Session Cache**
```typescript
// Cache user session client-side
const sessionCache = {
  user: null,
  expiry: 0,
  get() {
    if (Date.now() < this.expiry) return this.user;
    return null;
  }
};
```

#### 10. **Reduce HMR Impact**
- Add cleanup in useEffect return
- Prevent duplicate mounts in dev mode

## Implementation Plan

### Phase 1: Quick Wins (30 min)
1. ✅ Increase `POLLING_INTERVAL_MS` from 2s to 5s
2. ✅ Remove bot status polling fallback (rely on Realtime)
3. ✅ Add lazy loading for GitHub status check

### Phase 2: Caching (2 hours)
1. Add server-side auth cache with 5s TTL
2. Add React Query for client-side deduplication
3. Test with multiple tabs

### Phase 3: Architecture (4 hours)
1. Create `/api/student/dashboard-data` batch endpoint
2. Refactor dashboard to use single data fetch
3. Move to middleware-based auth

## Expected Impact

| Fix | Current | After | Reduction |
|-----|---------|-------|-----------|
| Polling 2s→5s | 30/min | 12/min | 60% |
| Server cache (5s) | 200/min | 50/min | 75% |
| Batch dashboard | 7 calls | 1 call | 85% |
| **Combined** | **200/min** | **15-20/min** | **90%** |

## Monitoring

Add logging to track:
```typescript
console.log('[AUTH] getUser() called from:', new Error().stack?.split('\n')[2]);
```

Or use middleware to count:
```typescript
let authCallCount = 0;
setInterval(() => {
  console.log(`Auth calls/min: ${authCallCount}`);
  authCallCount = 0;
}, 60000);
```

## Testing Checklist

- [ ] Bot running with status updates
- [ ] Multiple dashboard tabs open
- [ ] Tab switching between Profile/Preferences/Auto-Apply
- [ ] OAuth popup flow
- [ ] HMR refresh during development
- [ ] Check Supabase dashboard for request count

## Notes

- Supabase free tier: 50K monthly auth requests
- 200 req/min = 288K/day = 8.6M/month ⚠️
- **Current usage will hit limits fast**
- Production will have multiple users → multiply problem

## Files to Modify

1. `lib/server/auth.ts` - Add caching
2. `lib/bot-status/constants.ts` - Increase polling interval
3. `app/dashboard/student/features/auto-apply/hooks/useBotStatus.ts` - Remove fallback polling
4. `app/dashboard/student/hooks/useGitHubConnection.ts` - Lazy load
5. `app/api/student/dashboard-data/route.ts` - New batch endpoint
6. `app/dashboard/student/page.tsx` - Use batch endpoint
