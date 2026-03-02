# Architecture Refactor: Moving to Professional Token-Based Desktop Auth

## Current Issues (To Fix)

1. ❌ Hardcoded port range (43100-43199) in CSRF validation
2. ❌ Cookie-based auth requires API proxying
3. ❌ Special-case logic everywhere for desktop vs web
4. ❌ CSRF workarounds weaken security
5. ❌ Extra network latency from proxying
6. ❌ OAuth popup complexity in Electron

## Target Architecture

### Web App (No Changes)
```
Browser → www.jobelix.fr → Cookie Auth → API Routes → Supabase
```

### Desktop App (Refactored)
```
Electron → Direct API Calls → Token Auth → API Routes → Supabase
```

**Key Change**: Desktop app authenticates with **tokens**, not cookies.

---

## Step 1: Create Token-Based API Client

**File: `lib/client/apiClient.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://www.jobelix.fr';

/**
 * Unified API client for web (cookies) and desktop (tokens)
 */
export class ApiClient {
  private isElectron: boolean;
  
  constructor() {
    this.isElectron = typeof window !== 'undefined' && !!window.electronAPI;
  }
  
  /**
   * Make authenticated API request
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // Desktop: Add token auth
    if (this.isElectron) {
      const session = await window.electronAPI.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        headers['X-Client-Type'] = 'desktop';
      }
    }
    
    const url = this.isElectron 
      ? `${API_BASE}${endpoint}`  // Direct API call
      : endpoint;                 // Same-origin (uses cookies)
    
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: this.isElectron ? 'omit' : 'include', // No cookies in desktop
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return response.json();
  }
  
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }
  
  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  
  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
```

---

## Step 2: Update Auth Backend to Accept Tokens

**File: `lib/server/auth.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Authenticate request via cookie (web) or token (desktop)
 */
export async function authenticateRequest(request?: Request) {
  // Desktop: Check for Bearer token
  if (request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return { 
          error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) 
        };
      }
      
      return { user, supabase };
    }
  }
  
  // Web: Use cookie-based auth (existing logic)
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // Read-only for auth check
      },
    }
  );
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { 
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) 
    };
  }
  
  return { user, supabase };
}
```

---

## Step 3: Update CSRF to Skip Token Auth

**File: `lib/server/csrf.ts`**

```typescript
export function enforceSameOrigin(request?: CsrfRequest): NextResponse | null {
  if (!request) return null;

  // Skip CSRF for token-based auth (desktop apps)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return null; // Token auth doesn't need CSRF protection
  }

  // ... rest of CSRF validation for cookie-based auth
}
```

**Why this is better:**
- ✅ No hardcoded port ranges
- ✅ Clear separation: tokens = no CSRF, cookies = CSRF
- ✅ Industry standard approach

---

## Step 4: Remove Desktop Proxying

**File: `next.config.ts`**

```typescript
async rewrites() {
  // ❌ DELETE THIS - No more proxying needed
  // if (!isDesktopBundle) return [];
  // return {
  //   beforeFiles: [
  //     { source: "/api/:path*", destination: `${backend}/api/:path*` },
  //   ],
  // };
  
  return []; // Desktop makes direct API calls with tokens
}
```

**File: `proxy.ts`**

```typescript
export async function proxy(request: NextRequest) {
  // ❌ DELETE THIS - No more desktop proxy bypass
  // if (process.env.NEXT_DESKTOP_PROXY_API === '1') {
  //   return NextResponse.next({ request });
  // }
  
  // Just rate limiting and session refresh for web
}
```

---

## Step 5: Update Electron Session Management

**File: `preload.js`**

```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  // Replace cookie-based auth with token-based
  getSession: () => ipcRenderer.invoke('get-session'),
  setSession: (session) => ipcRenderer.invoke('set-session', session),
  clearSession: () => ipcRenderer.invoke('clear-session'),
  
  // ... rest of API
});
```

**File: `src/main/modules/ipc-handlers.js`**

```javascript
ipcMain.handle('get-session', async () => {
  const cache = await loadAuthCache();
  return cache; // Returns { access_token, refresh_token, expires_at, user }
});

ipcMain.handle('set-session', async (_, session) => {
  await saveAuthCache(session);
  return { success: true };
});
```

---

## Step 6: Migrate Frontend API Calls

**Before (cookie-based):**
```typescript
const response = await fetch('/api/student/credits/claim', {
  method: 'POST',
  credentials: 'include', // Sends cookies
});
```

**After (unified client):**
```typescript
import { apiClient } from '@/lib/client/apiClient';

const data = await apiClient.post('/api/student/credits/claim');
// Automatically uses tokens in desktop, cookies in web
```

---

## Step 7: Update OAuth Flow for Desktop

**Desktop OAuth should get tokens directly:**

```typescript
// After OAuth callback
const { data: { session } } = await supabase.auth.getSession();

if (window.electronAPI) {
  // Save session tokens to Electron secure storage
  await window.electronAPI.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    user: session.user,
  });
}
```

---

## Migration Steps

### Phase 1: Add Token Support (Non-Breaking)
1. ✅ Create `ApiClient` with token support
2. ✅ Update `authenticateRequest` to accept tokens OR cookies
3. ✅ Update CSRF to skip token auth
4. ✅ Test: Desktop app with tokens, web still uses cookies

### Phase 2: Migrate Desktop to Tokens
1. ✅ Update Electron IPC handlers for session management
2. ✅ Update OAuth flow to save tokens
3. ✅ Migrate frontend API calls to use `apiClient`
4. ✅ Test: Desktop app fully on tokens

### Phase 3: Remove Desktop Proxy (Breaking for Old Versions)
1. ✅ Remove rewrites in `next.config.ts`
2. ✅ Remove `NEXT_DESKTOP_PROXY_API` checks
3. ✅ Remove port range validation in CSRF
4. ✅ Update local-ui-server.js to remove proxy env vars

### Phase 4: Cleanup
1. ✅ Remove all desktop-specific workarounds
2. ✅ Simplify middleware (no more desktop bypasses)
3. ✅ Update documentation
4. ✅ Release new desktop app version

---

## Benefits After Refactor

### Code Quality
- ✅ No hardcoded port ranges
- ✅ No environment variable switches
- ✅ No CSRF workarounds
- ✅ Clear separation: web vs desktop
- ✅ Simpler, more maintainable

### Performance
- ✅ No proxy latency (direct API calls)
- ✅ Faster desktop app
- ✅ Better offline support (token refresh)

### Security
- ✅ Industry-standard token auth
- ✅ CSRF only where needed (cookies)
- ✅ No weakened security for special cases
- ✅ Better audit trail (X-Client-Type header)

### Developer Experience
- ✅ Unified API client
- ✅ Easier testing (inject tokens)
- ✅ Less confusing code

---

## Comparison: Current vs. Professional

| Aspect | Current (Cookie Proxy) | Refactored (Tokens) |
|--------|------------------------|---------------------|
| **Auth Method** | Cookies (desktop proxied) | Cookies (web) + Tokens (desktop) |
| **API Calls** | Proxied through local server | Direct to production |
| **CSRF** | Weakened with port range hack | Clean: skip for tokens |
| **Latency** | Higher (proxy hop) | Lower (direct) |
| **Code Complexity** | High (many workarounds) | Low (clean separation) |
| **Port Management** | Hardcoded 43100-43199 | Not needed |
| **Offline Support** | Poor | Good (refresh tokens) |
| **Industry Standard** | ❌ Non-standard | ✅ Standard practice |

---

## Timeline Estimate

- **Phase 1** (Add token support): 2-3 days
- **Phase 2** (Migrate desktop): 3-4 days
- **Phase 3** (Remove proxy): 1-2 days
- **Phase 4** (Cleanup + testing): 2-3 days

**Total**: ~2 weeks for complete professional refactor

---

## Conclusion

The current architecture **works** but is **not professional**. It's a series of clever workarounds that create technical debt.

The token-based architecture is:
- ✅ How Discord, Slack, Spotify, GitHub Desktop do it
- ✅ Simpler and more maintainable
- ✅ Better performance
- ✅ Industry best practice

**Recommendation**: Refactor to token-based auth. It's the right investment for long-term product quality.
