<div align="center">
  <img src="build/icon.png" alt="Jobelix logo" width="96" height="96">
  <h1>Jobelix</h1>
  <p>AI-assisted LinkedIn job application automation.</p>
  <p>
    <a href="https://www.jobelix.fr">Website</a>
    ·
    <a href="https://www.jobelix.fr/download">Download</a>
    ·
    <a href="https://github.com/jobelix-dev/jobelix/issues">Issues</a>
  </p>
</div>

<div align="center">
  <img src="public/hero-screenshot.png" alt="Jobelix screenshot" width="900">
</div>

## Overview

Jobelix combines a web app and a desktop automation app to streamline LinkedIn job applications for free.

- Build and manage your profile in the web app
- Parse resumes and answer screening questions with AI
- Run a desktop bot that automates form filling and submissions
- Track applications and manage credits

## Stack

- Web: Next.js, React, TypeScript, Tailwind CSS
- Backend: Supabase
- Desktop: Electron, Playwright
- AI and payments: OpenAI, Stripe

## Local Development

### Requirements

- Node.js 22+
- Docker
- Supabase CLI

### Setup

```bash
git clone https://github.com/jobelix-dev/jobelix.git
cd jobelix
npm install
cp .env.example .env.local
supabase start
npm run dev
```

The app runs at `http://localhost:3000`.

Use `.env.example` as the source of truth for required environment variables.

## Useful Scripts

```bash
npm run dev        # Next.js + Electron development
npm run build      # Production web build
npm run build:bot  # Build desktop bot runtime
npm test -- --run  # Run tests once
npm run dist       # Build distributable desktop artifacts
```

## Releases

- Push to `dev`: runs fast CI checks
- Open or update a PR to `main`: builds release artifacts for validation
- Merge into `main`: builds and publishes official releases

Linux install:

```bash
curl -fsSL https://jobelix.fr/install.sh | bash
```

Windows and macOS builds are published in the [releases repository](https://github.com/jobelix-dev/jobelix-releases/releases/latest).

## Contributing

Pull requests are welcome. Keep changes focused, follow existing patterns, and make sure your changes pass local checks before opening a PR.

## License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License. See [LICENSE](LICENSE) for details.
