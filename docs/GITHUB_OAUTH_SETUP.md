# GitHub OAuth Integration Setup

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_REDIRECT_URI=http://localhost:3000/api/oauth/github/callback

# For production (Vercel), set GITHUB_REDIRECT_URI to:
# GITHUB_REDIRECT_URI=https://your-domain.com/api/oauth/github/callback
```

---

## GitHub OAuth App Registration

### Step 1: Create a GitHub OAuth App

1. Go to GitHub Settings: https://github.com/settings/developers
2. Click **"New OAuth App"** (or **"New GitHub App"** for more features)
3. Fill in the application details:

**Application name:** `Jobelix` (or your app name)

**Homepage URL:** 
- Development: `http://localhost:3000`
- Production: `https://your-domain.com`

**Authorization callback URL:**
- Development: `http://localhost:3000/api/oauth/github/callback`
- Production: `https://your-domain.com/api/oauth/github/callback`

**Application description:** (Optional)
```
Jobelix helps students automatically generate profiles by importing data from GitHub repositories.
```

4. Click **"Register application"**

### Step 2: Get Your Credentials

After registration, you'll see:
- **Client ID**: Copy this value
- **Client secrets**: Click **"Generate a new client secret"** and copy it immediately (it won't be shown again)

### Step 3: Configure OAuth Scopes

The application requests the following scopes:
- `read:user` - Access user profile information (username, name, avatar)
- `repo` - Access repositories (public and private) - needed to fetch repository data

These scopes are automatically requested during the OAuth flow.

---

## Local Development Setup

1. **Create `.env.local`** in the project root:
```bash
cp .env.example .env.local  # if you have an example file
# OR create a new file
touch .env.local
```

2. **Add GitHub credentials:**
```bash
GITHUB_CLIENT_ID=Iv1.a1b2c3d4e5f6g7h8
GITHUB_CLIENT_SECRET=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t
GITHUB_REDIRECT_URI=http://localhost:3000/api/oauth/github/callback
```

3. **Restart your development server:**
```bash
npm run dev
```

4. **Test the OAuth flow:**
   - Go to `/dashboard/student` (Profile tab)
   - Click "Connect GitHub"
   - Authorize the application on GitHub
   - You'll be redirected back with the connection established

---

## Production Deployment (Vercel)

### Step 1: Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings → Environment Variables**
3. Add the following variables:

| Name | Value | Environment |
|------|-------|-------------|
| `GITHUB_CLIENT_ID` | Your production Client ID | Production, Preview, Development |
| `GITHUB_CLIENT_SECRET` | Your production Client Secret | Production, Preview, Development |
| `GITHUB_REDIRECT_URI` | `https://your-domain.vercel.app/api/oauth/github/callback` | Production |
| `GITHUB_REDIRECT_URI` | `https://your-preview-url.vercel.app/api/oauth/github/callback` | Preview |

### Step 2: Update GitHub OAuth App Settings

1. Go back to GitHub Settings → Developer settings → OAuth Apps
2. Edit your OAuth app
3. Update the **Authorization callback URL** to include your production domain:
   - Add: `https://your-domain.vercel.app/api/oauth/github/callback`
   - You can have multiple callback URLs by creating separate OAuth apps for dev/prod

### Step 3: Deploy

```bash
git push origin main
```

Vercel will automatically deploy with the new environment variables.

---

## Testing

### Test Locally

1. **Connect GitHub:**
   ```
   http://localhost:3000/dashboard/student
   Click "Connect GitHub" → Authorize → Check for "GitHub Connected" badge
   ```

2. **Import Repositories:**
   ```
   Click "Import Now" → Wait for import → Verify projects and skills added
   ```

3. **Test Resume + GitHub Merge:**
   ```
   Upload a resume → Check that existing GitHub projects are preserved
   ```

### Test OAuth Flow

1. **Authorization:** `GET /api/oauth/github/authorize`
   - Should redirect to GitHub with proper client_id and scopes
   
2. **Callback:** `GET /api/oauth/github/callback?code=...&state=...`
   - Should exchange code for token and save to database
   
3. **Status Check:** `GET /api/oauth/github/status`
   - Should return connection status

4. **Disconnect:** `POST /api/oauth/github/disconnect`
   - Should remove connection from database

---

## Security Notes

1. **Never commit `.env.local`** to version control
2. **Rotate secrets regularly** in production
3. **Use different OAuth apps** for development and production
4. **Consider encrypting tokens** in the database (use Supabase encryption functions)
5. **Implement rate limiting** for OAuth endpoints
6. **Monitor GitHub API rate limits** (5000 req/hour with OAuth)

---

## Troubleshooting

### "Missing GitHub OAuth credentials" Error
- Check that `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set in `.env.local`
- Restart your development server after adding env vars

### OAuth Redirect Mismatch
- Ensure `GITHUB_REDIRECT_URI` in `.env.local` matches the callback URL in GitHub OAuth app settings
- For local dev, use `http://localhost:3000/api/oauth/github/callback`
- No trailing slashes!

### "GitHub not connected" Error When Importing
- Check `/api/oauth/github/status` returns `connected: true`
- Verify token is stored in `oauth_connections` table
- Try disconnecting and reconnecting

### Import Returns No Repositories
- Check that user has public repositories on GitHub
- Verify OAuth scope includes `repo` permission
- Check GitHub API rate limits (authenticated: 5000/hour)

### Database Errors
- Run migrations: `supabase db reset`
- Check RLS policies allow user to read/write their own oauth_connections
- Verify `oauth_connections` table exists

---

## API Rate Limits

**GitHub API Limits:**
- Unauthenticated: 60 requests/hour
- Authenticated (OAuth): 5,000 requests/hour
- Each repo import = ~2-3 requests (repo data + languages)

**Recommendations:**
- Cache GitHub data in database (use `last_synced_at`)
- Implement "Sync" button instead of auto-sync on every page load
- Show last sync timestamp to users

---

## Database Schema

The `oauth_connections` table stores GitHub tokens:

```sql
CREATE TABLE oauth_connections (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  provider TEXT, -- 'github'
  access_token TEXT, -- OAuth token
  scope TEXT, -- 'read:user repo'
  connected_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  metadata JSONB, -- { username, name, avatar_url }
  UNIQUE(user_id, provider)
);
```

Run migration:
```bash
supabase db reset  # Development
# or
supabase migration up  # Production
```

---

## Support

For issues related to:
- **GitHub OAuth:** https://docs.github.com/en/apps/oauth-apps
- **Supabase RLS:** https://supabase.com/docs/guides/auth/row-level-security
- **API Routes:** Check server logs in Vercel or local console
