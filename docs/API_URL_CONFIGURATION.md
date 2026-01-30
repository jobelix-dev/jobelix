# API URL Configuration for Bot Communication

## Overview

The Electron bot needs to communicate with the Next.js backend API for GPT-4 requests. This document explains how the API URL is determined in different environments.

## URL Resolution Hierarchy

The bot determines the API URL using the following priority order:

1. **Frontend-provided URL** (passed via IPC) - **PREFERRED**
2. **Environment variable** `BACKEND_API_URL` or `NEXT_PUBLIC_BACKEND_URL`
3. **Fallback default**: `http://localhost:3000/api/autoapply/gpt4`

## Development Mode

### When running `npm run dev`:

The frontend automatically passes the API URL to the bot:

```typescript
// app/dashboard/student/features/auto-apply/hooks/useBot.ts
const apiUrl = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/autoapply/gpt4`
  : undefined;

await window.electronAPI.launchBot(token, apiUrl);
```

### Setup (.env.local):

```bash
# This file is read by Next.js during development
NEXT_PUBLIC_APP_URL=http://localhost:3000
BACKEND_API_URL=http://localhost:3000/api/autoapply/gpt4
```

**Important**: Use `.env.local` (not `.env`) because:
- `.env.local` is gitignored by default
- Next.js reads `.env.local` automatically
- It won't be committed to version control

## Production Mode

### Architecture Options

#### Option 1: Bundled Next.js Server (Recommended)
Package the Next.js API alongside Electron. The app runs its own local server.

**Pros:**
- Self-contained application
- No external API dependencies
- Works offline (except for OpenAI calls)

**Implementation:**
1. Build Next.js for production: `npm run build`
2. Bundle the `.next` folder and `node_modules` with Electron
3. Start Next.js server from Electron main process before launching bot
4. Pass `http://localhost:<random-port>/api/autoapply/gpt4` to bot

**See**: Electron-Next.js integration guides

#### Option 2: External API Server
Deploy Next.js separately (Vercel/AWS/etc.) and point Electron to it.

**Pros:**
- Easier updates (deploy API independently)
- Can serve web version from same backend

**Cons:**
- Requires internet connection
- API must be publicly accessible
- Need to handle authentication/rate limiting

**Implementation:**
Set `NEXT_PUBLIC_APP_URL` at build time:

```bash
# During Electron build
NEXT_PUBLIC_APP_URL=https://api.jobelix.com npm run build-installer
```

The frontend will pass `https://api.jobelix.com/api/autoapply/gpt4` to the bot.

### Environment Variables in Production

**Critical Limitation**: Electron apps cannot read `.env.local` files after packaging because:
- `.env.local` is a development-only file
- It's not bundled with the installer
- `process.env` in packaged Electron only contains system variables

**Solutions:**

1. **Frontend-provided URL (Current Implementation)**
   - ✅ Works in both dev and production
   - ✅ No environment file needed
   - ✅ Can be configured via user settings if needed

2. **Bake URL at build time**
   ```javascript
   // webpack config or build script
   new webpack.DefinePlugin({
     'process.env.BACKEND_API_URL': JSON.stringify('https://api.jobelix.com')
   })
   ```

3. **User configuration file**
   - Store API URL in `userData/config.json`
   - Read at runtime in Electron main process
   - Allow users to override if needed

## Testing Different Environments

### Local Development
```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Launch Electron
# Bot will use http://localhost:3000/api/autoapply/gpt4
```

### Production Build Testing
```bash
# Build with production API URL
NEXT_PUBLIC_APP_URL=https://api.jobelix.com npm run build

# Create installer
npm run build-installer

# Test the packaged app
```

## Troubleshooting

### Error: `getaddrinfo EAI_AGAIN api.jobelix.com`

**Cause**: Bot is trying to reach production URL in dev mode.

**Solution**: 
1. Restart `npm run dev` to reload environment variables
2. Verify `.env.local` contains `NEXT_PUBLIC_APP_URL=http://localhost:3000`
3. Check browser console for "[useBot] API URL: ..." log

### Error: `ECONNREFUSED localhost:3000`

**Cause**: Next.js dev server not running.

**Solution**: Always start bot after Next.js server is ready (wait for "Ready on http://localhost:3000").

### Bot works in dev but not in production

**Cause**: API URL not configured for production build.

**Solutions**:
1. Set `NEXT_PUBLIC_APP_URL` during build: `NEXT_PUBLIC_APP_URL=https://api.jobelix.com npm run build`
2. OR implement bundled Next.js server (Option 1 above)
3. OR add runtime configuration file

## Code References

- **Frontend API URL passing**: [app/dashboard/student/features/auto-apply/hooks/useBot.ts](../app/dashboard/student/features/auto-apply/hooks/useBot.ts#L346-L350)
- **Preload IPC definition**: [preload.js](../preload.js#L9)
- **IPC handler**: [src/main/modules/ipc-handlers.js](../src/main/modules/ipc-handlers.js#L73-L75)
- **Bot launcher**: [src/main/modules/node-bot-launcher.js](../src/main/modules/node-bot-launcher.js#L184-L186)
- **TypeScript definitions**: [lib/client/electronAPI.d.ts](../lib/client/electronAPI.d.ts#L4)

## Best Practices

1. **Never hardcode production URLs** in source code
2. **Always use environment variables** for URLs
3. **Pass API URLs from frontend** when possible (current implementation)
4. **Log the resolved API URL** during bot initialization for debugging
5. **Document deployment environment** requirements clearly

## Future Improvements

- [ ] Add user-configurable API URL in Settings UI
- [ ] Implement health check before launching bot
- [ ] Add fallback API endpoints for resilience
- [ ] Bundle Next.js server for fully offline operation
