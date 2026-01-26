# Jobelix - Job Application Platform 

Jobelix is a modern job application platform built with Next.js that connects students with companies. It features AI-powered resume parsing, real-time chat validation, and a comprehensive application tracking system.

## 🎯 What is Jobelix?

Jobelix helps students:
- Upload their resume (PDF) and have it automatically parsed by AI
- Complete their profile through an intelligent chat interface
- Browse and apply for job offers from companies
- Track their application status

For companies:
- Post job offers
- Review student applications
- Manage hiring pipeline

## 🏗️ Technology Stack

- **Framework**: Next.js 16.1.0 (React, App Router, Turbopack)
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o for resume parsing
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth

## 📚 Documentation Structure

**Start here if you're new:**
1. [Complete Beginner's Guide](docs/BEGINNERS_GUIDE.md) - Start here if you've never used TypeScript or Next.js
2. [Project Setup Guide](docs/SETUP.md) - How to install and run the project
3. [Project Architecture](docs/ARCHITECTURE.md) - How the codebase is organized
4. [Resume Validation System](docs/RESUME_VALIDATION.md) - How the AI validation works
5. [API Reference](docs/API_REFERENCE.md) - All API endpoints explained
6. [Database Schema](docs/DATABASE.md) - Database tables and relationships

## ⚡ Quick Start (5 minutes)

### Prerequisites
You need these installed on your computer:
- [Node.js](https://nodejs.org/) version 18 or higher
- npm (comes with Node.js)
- A code editor like [VS Code](https://code.visualstudio.com/)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd jobelix
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env.local` file in the root directory:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 🎓 For Complete Beginners

If you're new to web development or TypeScript, don't worry! We've created detailed guides:

- **Never used TypeScript?** Read our [TypeScript Basics Guide](docs/BEGINNERS_GUIDE.md#typescript-basics)
- **Never used Next.js?** Read our [Next.js Basics Guide](docs/BEGINNERS_GUIDE.md#nextjs-basics)
- **Never used React?** Read our [React Basics Guide](docs/BEGINNERS_GUIDE.md#react-basics)

## 📖 Key Concepts

### Resume Validation Flow
1. Student uploads PDF resume
2. OpenAI GPT-4o extracts information
3. Backend validates all fields with hard checks
4. Chat interface asks for missing/invalid fields
5. Student provides answers one by one
6. Backend validates each answer immediately
7. Profile is saved when all fields are valid

### Three-Category Validation System
- **Invalid**: Fields that failed validation (wrong format, vague answers)
- **Missing**: Fields not found in the resume
- **Uncertain**: Fields extracted with low confidence

### Security Features
- Server-side validation (no client bypass possible)
- Vague answer rejection ("idk", "none", "skip", etc.)
- Format validation (phone numbers, emails, dates)
- Anti-bypass measures

## 🗂️ Project Structure

```
jobelix/
├── app/                      # Next.js App Router pages
│   ├── api/                  # API routes (backend)
│   │   ├── auth/            # Authentication endpoints
│   │   ├── offers/          # Job offers endpoints
│   │   └── resume/          # Resume processing endpoints
│   ├── dashboard/           # Student/Company dashboards
│   ├── login/               # Login page
│   └── signup/              # Signup page
├── components/              # Reusable React components
├── lib/                     # Utility functions and helpers
│   ├── api.ts              # API client functions
│   ├── fieldValidation.ts  # Server-side validation logic
│   ├── supabaseClient.ts   # Supabase browser client
│   ├── supabaseServer.ts   # Supabase server client
│   └── types.ts            # TypeScript type definitions
├── supabase/               # Database migrations and config
│   └── migrations/         # SQL migration files
├── docs/                   # Documentation
└── public/                 # Static files
```

## 🔑 Important Files to Know

- `app/api/resume/extract-data/route.ts` - AI resume parsing
- `app/api/resume/chat/route.ts` - Validation chat logic
- `app/api/resume/finalize/route.ts` - Save validated data
- `lib/fieldValidation.ts` - All validation rules
- `components/ResumeChat.tsx` - Chat UI component

## 🐛 Common Issues

### "Module not found" errors
```bash
npm install
```

### "Supabase error" or "401 Unauthorized"
Check your `.env.local` file has the correct Supabase credentials

### "OpenAI API error"
Verify your `OPENAI_API_KEY` in `.env.local`

### Build errors
```bash
npm run build
```
This will show all TypeScript errors

## 🧪 Testing

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📝 Contributing

1. Create a new branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 🆘 Getting Help

- Read the [Beginner's Guide](docs/BEGINNERS_GUIDE.md)
- Check the [API Reference](docs/API_REFERENCE.md)
- Review the [Architecture](docs/ARCHITECTURE.md)

## 📄 License

[Add your license here]

---

**Ready to dive in?** Start with the [Complete Beginner's Guide](docs/BEGINNERS_GUIDE.md)!

Test

# Backend: 

## Etapes setup: 
- Installer docker (https://www.docker.com/products/docker-desktop/) et start (`sudo systemctl start docker` sur linux)
- Installer supabase CLI (https://supabase.com/docs/guides/local-development/cli/getting-started?queryGroups=platform&platform=linux)
- (ne faire que si le dossier supabase n'existe pas) 'supabase login' puis 'supabase init' puis 'supabase link --project-ref project_id_sur_supabase'
- 'supabase start' permet de lancer le client supabase sur: http://localhost:54323
- dans .env.local rajouter les champs : 
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=#récupérer ANON KEY depuis supabase status -o env | grep -E "(ANON_KEY|SERVICE_ROLE_KEY)"
```

## Commandes supabase utiles:
### Lancement env et arret
Commandes:

supabase stop --project-id Jobelix && supabase start

supabase start -> lance le venv (il faut que docker soit activé)
supabase stop -> stop le venv (pas besoin de le stop normalement il consomme pas trop)
supabase stop --no-backup -> reset le venv à la dernière migration (supprime les nouvelles tables/fonctions/trigers)

### Sauvegarde, pull et pushs - DB:
Commandes:
supabase db pull -> recupére ce qui est sur le site (s'il y a eu des migration faites directement dessus)
supabase db reset -> update la db supabase après une migration (supprime toutes les mocks datas. Voir plus bas pour les sauvegarder)
supabase db diff --use-migra -f nom_de_la_migration -> rajoute le code EQL entre l'ancienne version et la nouvelle. 
supabase db push -> update la version du site web. 

### A propos des mocks datas:
Les mocks datas sont regénérés à partir du fichier seed.sql. On peut quand même extraire des vrais datas de notre base de données au besoin (en utilisant un csv téléchargeable sur le site de la db de prod (supabase.com)). 

Commande:
supabase db dump --local --data-only > supabase/nom.sql -> Permet de sauvegarder les données actuelles dans le fichier "nom.sql" (comme ca elles sont sauvegardées quelquepart avant un reset)


Remarque: Si le seed.sql ne marche pas à cause du auth, on peut rajouter les lignes de la table auth à la main:
"""
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES 
  ('le-uuid-que-tu-utilises-dans-students', 'moi@test.com', crypt('password123', gen_salt('bf')), now())
ON CONFLICT (id) DO NOTHING;
"""


# guide for testing stripe locally
Choose sandbox in stripe dashboard and get STRIPE_SECRET_KEY
set it in .env important!
then stripe login

verify sandbox matches with stripe config --list
create product in that dashboard and get price id, set it in .env

Start webhook
./stripe listen --forward-to localhost:3000/api/stripe/webhook
set it in .env


# Guide for deployement: 
- check the version in github (jobelix-releases), and set the right number in package.json, 
- update also the version of the engine, 
- clean the resources folder, 
- push the release (npm run release)
- validate the release on github (from draft to latest)

# Python bot runtime (Electron)
The Electron app bundles a prebuilt Python runtime from GitHub Releases.

Environment:
- `PY_RUNTIME_TAG=py-runtime-v0.4.0` (release tag in `lukalafaye/LinkedinAutoApply`)
- Optional auth: `GITHUB_TOKEN` or `GH_TOKEN`

Commands:
- `npm run fetch:bot` downloads the platform zip and installs it to:
  - Windows: `resources/win/main/`
  - macOS: `resources/mac/main/`
  - Linux: `resources/linux/main/`
- `npm run dist` and `npm run release` automatically run `fetch:bot` first.

Packaged app path:
- The runtime is bundled into `process.resourcesPath/<platform>/main/...` and used by `getBotPath()`.

Updating the runtime:
- Change `PY_RUNTIME_TAG`, run `npm run fetch:bot`, then package again.

Arch Linux:
- The runtime is compiled manually and placed in `resources/linux-arch/main/`.
- `npm run fetch:bot` will skip download on Arch and use the existing runtime.
- Packaged builds include both `linux` (Ubuntu-family) and `linux-arch` resources.

Current version
PY_RUNTIME_TAG=py-runtime-v0.0.1 npm run fetch:bot
