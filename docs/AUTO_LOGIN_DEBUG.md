# Auto-Login Issue Analysis and Fix

## Problem Summary

**Issue:** User was not automatically logged in after app relaunch, despite having cached authentication tokens.

**Root Cause:** The cached authentication tokens were being cleared shortly after being loaded, preventing automatic login.

## What Was Happening

### Timeline of Events (from logs):

```
21:10:32.041 › [IPC: load-auth-cache] Loading auth cache
21:10:32.133 › Auth cache loaded successfully  
21:10:32.469 › [IPC: clear-auth-cache] Clearing auth cache  ← PROBLEM!
21:10:32.471 › Auth cache cleared successfully
```

### The Issue Chain:

1. **App Launch** → Auth cache loaded successfully ✅
2. **AutoLogin Component** → Attempted to restore session from cache
3. **Session Restoration Failed** → Either:
   - Tokens were expired
   - Session restoration returned null
   - API call to `/api/auth/profile` failed
4. **Cache Cleared** → App cleared the "invalid" cache
5. **User Not Logged In** → Had to log in manually again

## Where the Cache Was Cleared

The cache was being cleared from **two possible locations**:

### 1. `app/components/AutoLogin.tsx`
```tsx
if (error) {
  console.warn('Failed to restore session from cache:', error);
  await window.electronAPI.clearAuthCache(); // ← Clears if session restoration fails
  return;
}

if (data.session) {
  router.push('/dashboard');
} else {
  console.warn('No valid session after auto-login attempt');
  await window.electronAPI.clearAuthCache(); // ← Clears if no session returned
}
```

### 2. `app/dashboard/page.tsx`
```tsx
if (!response.profile) {
  // Clear cache if profile loading fails (invalid session)
  if (typeof window !== 'undefined' && window.electronAPI?.clearAuthCache) {
    await window.electronAPI.clearAuthCache(); // ← Clears if profile API fails
  }
  router.push('/');
  return;
}
```

## The Fix

### Changes Made to `AutoLogin.tsx`:

1. **Added Token Expiration Check**
   - Check if tokens are expired before attempting to use them
   - Give 5-minute buffer before expiration

2. **Improved Token Refresh**
   - Let Supabase automatically refresh expired tokens
   - Update cache with new tokens after refresh

3. **Better Logging**
   - Added `[AutoLogin]` prefix to all logs for easy tracking
   - Log token expiration status
   - Log when tokens are refreshed and cache is updated

### New Auto-Login Flow:

```
1. Load cached tokens
2. Check if tokens are expired (with 5 min buffer)
3. Call supabase.auth.setSession() → Supabase will refresh if needed
4. If session restored successfully:
   a. Check if tokens were refreshed
   b. If yes, update cache with new tokens
   c. Redirect to dashboard
5. If session restoration failed:
   a. Log the error details
   b. Clear invalid cache
```

## How to Test the Fix

### Test 1: Fresh Login
1. Clear any existing cache: Log out completely
2. Log in with valid credentials
3. Verify cache is saved (check logs for "Auth cache saved")
4. Close the app

### Test 2: Auto-Login with Valid Tokens
1. Relaunch the app within a few minutes
2. Check console logs for:
   ```
   [AutoLogin] Found cached auth tokens, checking expiration...
   [AutoLogin] Auto-login successful
   [AutoLogin] Redirecting to dashboard
   ```
3. Verify you're automatically logged in to dashboard

### Test 3: Auto-Login with Expired Tokens
1. Wait for tokens to expire (default: 1 hour)
2. Relaunch the app
3. Check console logs for:
   ```
   [AutoLogin] Found cached auth tokens, checking expiration...
   [AutoLogin] Tokens expired, will attempt refresh
   [AutoLogin] Tokens were refreshed, updating cache
   [AutoLogin] Auto-login successful
   ```
4. Verify you're automatically logged in with refreshed tokens

### Test 4: Auto-Login with Invalid Cache
1. Manually corrupt the cache file at:
   - macOS: `~/Library/Application Support/jobelix/auth-cache.enc`
2. Relaunch the app
3. Check console logs for:
   ```
   [AutoLogin] Failed to restore session from cache: <error>
   ```
4. Verify cache is cleared and you're redirected to login

## Expected Log Output (Success Case)

```
[IPC: load-auth-cache] Loading auth cache
Auth cache loaded successfully
[AutoLogin] Found cached auth tokens, checking expiration...
[AutoLogin] Auto-login successful
[AutoLogin] Redirecting to dashboard
```

## Expected Log Output (Token Refresh Case)

```
[IPC: load-auth-cache] Loading auth cache
Auth cache loaded successfully
[AutoLogin] Found cached auth tokens, checking expiration...
[AutoLogin] Tokens expired, will attempt refresh
[AutoLogin] Auto-login successful
[AutoLogin] Tokens were refreshed, updating cache
[IPC: save-auth-cache] Saving auth cache
Auth cache saved successfully
[AutoLogin] Redirecting to dashboard
```

## Expected Log Output (Failure Case)

```
[IPC: load-auth-cache] Loading auth cache
Auth cache loaded successfully
[AutoLogin] Found cached auth tokens, checking expiration...
[AutoLogin] Failed to restore session from cache: <error message>
[AutoLogin] Error details: {...}
[IPC: clear-auth-cache] Clearing auth cache
Auth cache cleared successfully
```

## Additional Improvements Recommended

1. **Token Lifetime Management**
   - Consider implementing a "remember me" checkbox
   - Short session for quick logouts (default)
   - Long session for "remember me" (30 days)

2. **Retry Logic**
   - If token refresh fails due to network, retry before clearing cache
   - Add exponential backoff for retries

3. **User Feedback**
   - Show a subtle "logging you in..." message during auto-login
   - Show "session expired, please log in again" if refresh fails

4. **Cache Validation**
   - Add integrity checks to cache data
   - Verify token structure before attempting to use

## Files Modified

- `/Users/domidels/Documents/nextjs-app/app/components/AutoLogin.tsx`
  - Added token expiration checking
  - Added token refresh detection and cache update
  - Improved logging with `[AutoLogin]` prefix
  - Added detailed error logging

## Testing Checklist

- [ ] Fresh login saves cache correctly
- [ ] Auto-login works with valid tokens
- [ ] Auto-login works with expired tokens (refresh)
- [ ] Invalid cache is cleared properly
- [ ] Logs show clear indication of what's happening
- [ ] No cache cleared unexpectedly after successful auto-login
- [ ] Dashboard doesn't clear cache after successful profile load

## Monitoring

Watch the console logs on app launch. The `[AutoLogin]` prefix will help you track the auto-login process:

```bash
# Good: Successful auto-login
[AutoLogin] Found cached auth tokens
[AutoLogin] Auto-login successful
[AutoLogin] Redirecting to dashboard

# Good: Successful refresh
[AutoLogin] Tokens expired, will attempt refresh
[AutoLogin] Tokens were refreshed, updating cache

# Bad: Cache cleared
[AutoLogin] Failed to restore session
[IPC: clear-auth-cache] Clearing auth cache
```

## Previous Issue: Bot Launch Error -86

**Note:** This is separate from the auto-login issue, but for reference:

**Error:** `spawn Unknown system error -86` (bad CPU type in executable)

**Cause:** The Python bot runtime at `resources/mac/main/main` was compiled for ARM64 (Apple Silicon), but your Mac is Intel (x86_64).

**Solution:** Download the correct runtime for Intel Macs:
- Change the tag or ensure the script downloads Intel-compatible binaries
- Or use Rosetta 2 to run ARM64 binaries on Intel
