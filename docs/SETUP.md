# Project Setup Guide

This guide will help you set up Jobelix on your local machine step by step.

## Prerequisites

### Required Software

1. **Node.js** (version 18 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Check installation: `node --version`
   - Should show: `v18.0.0` or higher

2. **npm** (comes with Node.js)
   - Check installation: `npm --version`
   - Should show: `9.0.0` or higher

3. **Git**
   - Download from [git-scm.com](https://git-scm.com/)
   - Check installation: `git --version`

4. **Code Editor** (recommended: VS Code)
   - Download from [code.visualstudio.com](https://code.visualstudio.com/)

### Required Accounts

1. **Supabase Account**
   - Sign up at [supabase.com](https://supabase.com/)
   - Free tier is sufficient for development

2. **OpenAI Account**
   - Sign up at [platform.openai.com](https://platform.openai.com/)
   - You'll need API credits (starts at $5)

---

## Installation Steps

### 1. Clone the Repository

```bash
# Clone the project
git clone <repository-url>

# Navigate into the directory
cd jobelix
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages listed in `package.json`:
- Next.js (framework)
- React (UI library)
- Supabase (database & auth)
- OpenAI (AI processing)
- Tailwind CSS (styling)
- And more...

**Expected output:**
```
added 324 packages in 45s
```

### 3. Set Up Supabase

#### Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in:
   - Project name: `jobelix` (or any name)
   - Database password: (create a strong password, save it!)
   - Region: Choose closest to you
4. Click "Create new project"
5. Wait 1-2 minutes for setup

#### Get Supabase Credentials

1. In your Supabase project dashboard
2. Click "Settings" (gear icon) → "API"
3. Copy these two values:
   - **Project URL** (under "Configuration")
   - **anon/public key** (under "Project API keys")

#### Run Database Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>
# Project ref is in your Supabase URL: https://<project-ref>.supabase.co

# Run migrations
supabase db push
```

This creates all the database tables (student, academic, experience, etc.)

#### Set Up Storage Bucket

1. In Supabase dashboard, go to "Storage"
2. Click "Create bucket"
3. Name: `resumes`
4. Make it **private** (not public)
5. Click "Create bucket"

### 4. Set Up OpenAI

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Name it: `jobelix-dev`
4. Copy the key (starts with `sk-...`)
5. **Save it immediately** (you can't see it again!)

### 5. Configure Environment Variables

Create a file named `.env.local` in the project root:

```bash
# Create the file
touch .env.local
```

Open `.env.local` and add:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-key-here
```

**Replace:**
- `your-project-ref` with your Supabase project reference
- `your-anon-key-here` with your Supabase anon key
- `sk-your-openai-key-here` with your OpenAI API key

**Example:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-proj-abc123...
```

### 6. Run the Development Server

```bash
npm run dev
```

**Expected output:**
```
▲ Next.js 16.1.0 (Turbopack)
- Local:         http://localhost:3000
- Network:       http://192.168.1.x:3000

✓ Starting...
✓ Ready in 2.1s
```

### 7. Open in Browser

Navigate to [http://localhost:3000](http://localhost:3000)

You should see the Jobelix homepage!

---

## Verify Installation

### Test 1: Can you see the homepage?
- ✅ You should see the Jobelix landing page
- ❌ If you see an error, check the terminal for error messages

### Test 2: Can you create an account?
1. Click "Sign Up"
2. Choose "Student" or "Company"
3. Fill in email and password
4. Click "Sign Up"
- ✅ You should be redirected to the dashboard
- ❌ If you get an error, check your Supabase configuration

### Test 3: Can you upload a resume? (Students only)
1. Log in as a student
2. Click "Upload Resume" or similar button
3. Select a PDF file
4. Click upload
- ✅ The AI should start processing
- ❌ If you get an error:
  - Check OpenAI API key is correct
  - Check you have API credits
  - Check the storage bucket exists

---

## Common Issues

### Issue: "Module not found" errors

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Supabase error: Invalid API key"

**Solution:**
- Check `.env.local` has the correct keys
- Make sure there are no extra spaces
- Restart the dev server: Stop (Ctrl+C) and run `npm run dev` again

### Issue: "OpenAI API error: Incorrect API key"

**Solution:**
- Verify your OpenAI API key in `.env.local`
- Make sure it starts with `sk-`
- Check you have credits: [platform.openai.com/account/billing](https://platform.openai.com/account/billing)

### Issue: "Failed to upload file"

**Solution:**
- Check the `resumes` bucket exists in Supabase Storage
- Verify bucket permissions (should be private)
- Check Supabase RLS policies allow the operation

### Issue: Port 3000 already in use

**Solution:**
```bash
# Kill the process using port 3000
# On macOS/Linux:
lsof -ti:3000 | xargs kill -9

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <process-id> /F

# Or use a different port:
npm run dev -- -p 3001
```

### Issue: TypeScript errors on startup

**Solution:**
```bash
# Check for type errors
npm run build

# Fix any errors shown, then:
npm run dev
```

---

## Development Workflow

### Daily Development

1. **Start the server**
```bash
npm run dev
```

2. **Make changes** to files

3. **See changes automatically**
   - Next.js auto-reloads when you save files
   - Check browser and terminal for errors

4. **Stop the server**
   - Press `Ctrl+C` in terminal

### Before Committing

1. **Check for errors**
```bash
npm run build
```

2. **Format code** (optional)
```bash
npm run lint
```

3. **Commit changes**
```bash
git add .
git commit -m "Description of changes"
git push
```

---

## Project Scripts

```bash
# Development (with hot reload)
npm run dev

# Production build
npm run build

# Run production build
npm start

# Lint code
npm run lint
```

---

## IDE Setup (VS Code Recommended)

### Recommended Extensions

1. **ES7+ React/Redux/React-Native snippets**
   - ID: `dsznajder.es7-react-js-snippets`
   - Provides React code snippets

2. **Tailwind CSS IntelliSense**
   - ID: `bradlc.vscode-tailwindcss`
   - Autocomplete for Tailwind classes

3. **TypeScript Error Translator**
   - ID: `mattpocock.ts-error-translator`
   - Makes TypeScript errors easier to understand

4. **Prettier - Code formatter**
   - ID: `esbenp.prettier-vscode`
   - Auto-formats code

5. **ESLint**
   - ID: `dbaeumer.vscode-eslint`
   - Shows code quality issues

### VS Code Settings

Add to `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.updateImportsOnFileMove.enabled": "always"
}
```

---

## Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes | `https://abc.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes | `eyJhbGciOi...` |
| `OPENAI_API_KEY` | OpenAI API key | Yes | `sk-proj-...` |

**Note:** Variables starting with `NEXT_PUBLIC_` are accessible in the browser. Keep sensitive keys (like `OPENAI_API_KEY`) without this prefix.

---

## Database Setup Details

### Tables Created by Migrations

1. **student** - Student profiles
2. **company** - Company profiles
3. **academic** - Education history
4. **experience** - Work experience
5. **company_offer** - Job postings
6. **application** - Job applications
7. **student_profile_draft** - Temporary resume data during processing

### Storage Buckets

1. **resumes** - Stores uploaded PDF files

### RLS (Row Level Security) Policies

Automatically created to ensure:
- Students can only see their own data
- Companies can only see their own data
- Proper access control for applications

---

## Next Steps

Now that your environment is set up:

1. Read the [Beginner's Guide](BEGINNERS_GUIDE.md) to understand the code
2. Review the [Architecture Guide](ARCHITECTURE.md) to see how everything fits together
3. Check the [API Reference](API_REFERENCE.md) to understand the endpoints
4. Try making a small change to see the development workflow

---

## Getting Help

If you're stuck:

1. Check this setup guide again
2. Look for error messages in:
   - Browser console (F12 → Console)
   - Terminal where `npm run dev` is running
3. Check the [Common Issues](#common-issues) section
4. Review the [Beginner's Guide](BEGINNERS_GUIDE.md)