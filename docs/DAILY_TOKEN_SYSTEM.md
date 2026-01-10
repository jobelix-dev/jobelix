# Daily Token System - Usage Guide

## Overview
Daily token system for rate-limiting GPT-4 API calls from the compiled Python app.

## How It Works

### 1. User Flow
1. User navigates to **Auto Apply** tab in student dashboard
2. Clicks **Generate Daily Token** button (once per day)
3. Token appears with usage counter (100 uses by default)
4. User copies token and passes it to compiled app:
   ```bash
   # Linux
   ./main --playwright YOUR_TOKEN_HERE
   
   # Windows (coming soon)
   main.exe --playwright YOUR_TOKEN_HERE
   ```

### 2. Token Lifecycle
- **Creation**: One token per day per user
- **Expiry**: Resets at midnight (00:00:00 local time)
- **Usage**: 100 API calls per token (configurable)
- **Display**: Shows remaining uses in real-time

### 3. API Routes

#### GET `/api/student/tokens/current`
Fetches today's active token for logged-in user.

**Response:**
```json
{
  "hasToken": true,
  "token": {
    "id": "uuid",
    "token": "64-char-hex-string",
    "uses_remaining": 95,
    "max_uses": 100,
    "revoked": false,
    "created_at": "2026-01-10T08:00:00Z",
    "last_used_at": "2026-01-10T09:15:00Z"
  }
}
```

#### POST `/api/student/tokens/generate`
Generates new daily token (enforces one-per-day limit).

**Response (Success):**
```json
{
  "success": true,
  "token": { /* same as above */ },
  "message": "Daily token generated successfully"
}
```

**Response (Already Generated Today):**
```json
{
  "error": "Daily token already generated",
  "message": "You can only generate one token per day",
  "existingToken": { /* existing token info */ }
}
```

#### POST `/api/autoapply/gpt4`
Proxies GPT-4 calls with token validation and usage tracking.

**Request:**
```json
{
  "token": "your-64-char-token",
  "messages": [
    { "role": "user", "content": "Write a cover letter..." }
  ],
  "model": "gpt-4"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    /* OpenAI completion object */
  }
}
```

**Error Responses:**
- `401`: Invalid token
- `403`: Token revoked
- `402`: Usage exhausted (no uses remaining)

### 4. Database Schema

**Table: `gpt_tokens`**
```sql
CREATE TABLE public.gpt_tokens (
  id uuid PRIMARY KEY,
  token text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  uses_remaining integer DEFAULT 100,
  max_uses integer DEFAULT 100,
  revoked boolean DEFAULT false,
  is_daily_token boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);
```

**Indexes:**
- `token` - Fast lookup for API validation
- `(user_id, created_at DESC)` - Daily token queries

**RLS Policies:**
- Users can only view/insert their own tokens
- Service role bypasses RLS for validation

### 5. Configuration

**Daily Limit (Server-side):**
Edit `/api/student/tokens/generate/route.ts`:
```typescript
const DAILY_TOKEN_MAX_USES = 100; // Change this value
```

**Model Selection (Client-side):**
Compiled app can request different models:
- `gpt-4` (default)
- `gpt-4-turbo`
- `gpt-3.5-turbo` (cheaper)

### 6. Security Notes

✅ **Implemented:**
- Token stored in database (server-side validation)
- RLS policies prevent cross-user access
- One token per day limit
- Usage counter decrements atomically
- Service role key never exposed to client

⚠️ **Recommended for Production:**
- Hash tokens in database (store SHA-256)
- Add rate limiting per IP
- Log all API calls for audit
- Add token expiry timestamp
- Implement token revocation UI

### 7. Example Python App Integration

```python
import sys
import requests

def call_gpt4(token: str, prompt: str) -> str:
    """Call the backend GPT-4 proxy with token."""
    response = requests.post(
        'https://your-domain.com/api/autoapply/gpt4',
        json={
            'token': token,
            'messages': [
                {'role': 'user', 'content': prompt}
            ],
            'model': 'gpt-4'
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        return data['result']['choices'][0]['message']['content']
    elif response.status_code == 402:
        print("Error: Daily usage limit exceeded")
        sys.exit(1)
    else:
        print(f"Error: {response.json().get('error')}")
        sys.exit(1)

# Usage in compiled app
if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--playwright', required=True, help='API token')
    args = parser.parse_args()
    
    token = args.playwright
    result = call_gpt4(token, "Write a cover letter for Software Engineer role")
    print(result)
```

### 8. Monitoring & Analytics

**Future Enhancements:**
- Dashboard showing usage trends
- Email notifications when usage > 80%
- Per-user analytics (total calls, avg response time)
- Cost tracking (token usage × pricing)
- Weekly usage reports
