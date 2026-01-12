# API Rate Limiting System

## Overview

This system prevents abuse of expensive API endpoints (like GPT-4) by limiting the number of requests users can make per hour and per day.

## Implementation

### Database Components

**Table: `api_call_log`**
- Tracks all API calls per user per endpoint
- Indexed for fast lookups by user, endpoint, and timestamp
- Automatically cleaned up after 30 days

**Functions:**
- `check_api_rate_limit()` - Check if user is within limits (returns remaining calls)
- `log_api_call()` - Log a successful API call
- `cleanup_old_api_logs()` - Maintenance function (run via cron)

### Application Layer

**File: `/lib/rateLimiting.ts`**

Reusable utilities:
- `checkRateLimit()` - Verify user hasn't exceeded limits
- `logApiCall()` - Record successful API usage
- `addRateLimitHeaders()` - Add rate limit info to response headers
- `rateLimitExceededResponse()` - Standard 429 error response

## Configuration

### GPT-4 Endpoint Limits

```typescript
const RATE_LIMIT_HOURLY = 100  // Max 100 calls per hour
const RATE_LIMIT_DAILY = 500   // Max 500 calls per day
```

### How It Works

1. **Before API call:** Check if user is within rate limits
   ```typescript
   const rateLimitResult = await checkRateLimit(user_id, {
     endpoint: 'gpt4',
     hourlyLimit: 100,
     dailyLimit: 500
   });
   
   if (!rateLimitResult.data.allowed) {
     return rateLimitExceededResponse(rateLimitConfig, rateLimitResult.data);
   }
   ```

2. **Make API call:** Process the request (deduct credits, call OpenAI, etc.)

3. **After successful call:** Log the usage
   ```typescript
   await logApiCall(user_id, 'gpt4');
   ```

4. **Add headers:** Include rate limit info in response
   ```typescript
   addRateLimitHeaders(response, rateLimitConfig, rateLimit);
   ```

## Response Headers

All rate-limited endpoints include these headers:

- `X-RateLimit-Hourly-Limit`: Maximum calls per hour (e.g., 100)
- `X-RateLimit-Daily-Limit`: Maximum calls per day (e.g., 500)
- `X-RateLimit-Hourly-Remaining`: Calls remaining this hour
- `X-RateLimit-Daily-Remaining`: Calls remaining today
- `X-RateLimit-Hourly-Used`: Calls made this hour
- `X-RateLimit-Daily-Used`: Calls made today

## Error Responses

### 429 Too Many Requests

```json
{
  "error": "Rate limit exceeded",
  "message": "You have exceeded the rate limit for gpt4. Hourly: 100/100, Daily: 450/500",
  "hourly_limit": 100,
  "daily_limit": 500,
  "hourly_remaining": 0,
  "daily_remaining": 50,
  "hourly_used": 100,
  "daily_used": 450
}
```

## Adding Rate Limiting to New Endpoints

1. **Import utilities:**
   ```typescript
   import { checkRateLimit, logApiCall, addRateLimitHeaders } from '@/lib/rateLimiting';
   ```

2. **Define limits:**
   ```typescript
   const RATE_LIMIT_HOURLY = 50;
   const RATE_LIMIT_DAILY = 200;
   ```

3. **Check before processing:**
   ```typescript
   const rateLimitResult = await checkRateLimit(user_id, {
     endpoint: 'your-endpoint-name',
     hourlyLimit: RATE_LIMIT_HOURLY,
     dailyLimit: RATE_LIMIT_DAILY
   });
   
   if (rateLimitResult.error) return rateLimitResult.error;
   if (!rateLimitResult.data.allowed) {
     return rateLimitExceededResponse(rateLimitConfig, rateLimitResult.data);
   }
   ```

4. **Log after success:**
   ```typescript
   await logApiCall(user_id, 'your-endpoint-name');
   ```

## Security Considerations

- ✅ Rate limits are checked BEFORE expensive operations
- ✅ Logs are only written for successful calls (don't count failures)
- ✅ Uses service role for database operations (bypasses RLS)
- ✅ Old logs automatically cleaned up (prevents table bloat)
- ✅ Indexed for fast queries (no performance impact)

## Monitoring

To check usage:

```sql
-- See API calls by endpoint today
SELECT endpoint, COUNT(*) as calls, COUNT(DISTINCT user_id) as users
FROM api_call_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY endpoint
ORDER BY calls DESC;

-- See top users for an endpoint
SELECT user_id, COUNT(*) as calls
FROM api_call_log
WHERE endpoint = 'gpt4'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id
ORDER BY calls DESC
LIMIT 10;
```

## Maintenance

Run cleanup function periodically (via cron or scheduled job):

```sql
SELECT cleanup_old_api_logs(); -- Removes logs older than 30 days
```

## Future Enhancements

- [ ] Add burst protection (max 10 calls per minute)
- [ ] Different limits for different user tiers (free vs paid)
- [ ] Admin dashboard to view rate limit analytics
- [ ] Automatic rate limit adjustment based on credit balance
- [ ] Email notifications when users hit 80% of their limits
