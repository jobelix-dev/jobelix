# LinkedIn Auto Apply Bot - Node.js Implementation

This is the **Node.js bot** that runs inside the Electron app. It automates LinkedIn job applications using Playwright for browser automation and GPT-4 for intelligent form filling.

## 📁 Directory Structure

```
bot/
├── index.ts           # Main entry point - LinkedInBot facade class
├── types/             # TypeScript type definitions
│   └── index.ts       # All interfaces and types
├── ai/                # AI/GPT integration
│   ├── gpt-answerer.ts    # Main GPT service for form responses
│   ├── backend-client.ts  # HTTP client for GPT API
│   ├── resume-tailoring.ts # 4-stage resume tailoring pipeline
│   └── prompts/           # GPT prompt templates
├── linkedin/          # LinkedIn-specific automation
│   ├── authenticator.ts   # Manual login flow handler
│   ├── job-manager.ts     # Job search and application orchestrator
│   └── easy-apply/        # Easy Apply form automation
│       ├── easy-applier.ts    # Main Easy Apply orchestrator
│       ├── form-handler.ts    # Form field coordinator
│       ├── navigation.ts      # Modal navigation (Next/Submit)
│       ├── selectors.ts       # CSS selectors for LinkedIn
│       └── field-handlers/    # Strategy pattern handlers
├── models/            # Data models
│   ├── job.ts             # Job data model
│   ├── resume.ts          # Resume YAML parser
│   ├── resume-generator.ts # PDF resume generation
│   └── resume-scorer.ts   # Resume relevance scoring
├── core/              # Core functionality
│   └── config-validator.ts # Config.yaml validation
└── utils/             # Shared utilities
    ├── logger.ts          # Logging utilities
    ├── paths.ts           # File path utilities
    ├── status-reporter.ts # UI status updates
    ├── browser-utils.ts   # Browser state helpers
    ├── delays.ts          # Human-like delays
    ├── debug-html.ts      # Debug snapshots
    └── llm-logger.ts      # API call logging
```

## 🏗️ Architecture

### Design Patterns Used

1. **Facade Pattern** (`index.ts`)
   - `LinkedInBot` class orchestrates all components
   - Simple interface: `initialize()` → `start()` → `stop()`

2. **Strategy Pattern** (`field-handlers/`)
   - Each handler handles one type of form field
   - `FormHandler` iterates handlers until one matches

3. **Observer Pattern** (`status-reporter.ts`)
   - Real-time status updates to Electron UI via IPC

## 🚀 Quick Start (for developers)

### Understanding the flow:

1. **Initialization** (`LinkedInBot.initialize()`)
   - Loads `config.yaml` and `resume.yaml`
   - Sets up GPT answerer with backend API

2. **Login** (`LinkedInAuthenticator.start()`)
   - Opens LinkedIn in browser
   - Waits for user to manually log in

3. **Job Search** (`LinkedInJobManager.startApplying()`)
   - Generates search URL combinations
   - Navigates through job listings
   - Filters blacklisted companies/titles

4. **Apply** (`EasyApplier.apply()`)
   - Opens Easy Apply modal
   - Fills forms using AI
   - Submits application

### Key Files to Understand:

| File | Purpose | Complexity |
|------|---------|------------|
| `index.ts` | Start here - main bot class | ⭐ Low |
| `types/index.ts` | All type definitions | ⭐ Low |
| `linkedin/authenticator.ts` | Login flow | ⭐ Low |
| `linkedin/job-manager.ts` | Job search loop | ⭐⭐ Medium |
| `linkedin/easy-apply/easy-applier.ts` | Apply flow | ⭐⭐ Medium |
| `ai/gpt-answerer.ts` | GPT integration | ⭐⭐⭐ High |

## 📝 Common Tasks

### Adding a new form field handler:

1. Create file in `field-handlers/` (e.g., `my-handler.ts`)
2. Extend `BaseFieldHandler`
3. Implement `canHandle()` and `handle()`
4. Add to handler list in `form-handler.ts`

```typescript
export class MyHandler extends BaseFieldHandler {
  async canHandle(element: Locator): Promise<boolean> {
    // Return true if this handler can process the element
  }
  
  async handle(element: Locator): Promise<boolean> {
    // Fill the form field, return true on success
  }
}
```

### Adding a new GPT prompt:

1. Add template in `ai/prompts/templates.ts`
2. Add method in `ai/gpt-answerer.ts`

### Debugging form issues:

1. Check `~/.config/jobelix/debug_html/` for HTML snapshots
2. Check `~/.config/jobelix/output/llm_calls.json` for API calls
3. Use `log.debug()` for detailed logging

## ⚙️ Configuration

Bot reads from `~/.config/jobelix/` (Linux):
- `config.yaml` - Job search settings
- `resume.yaml` - Resume data

## 🧪 Testing

```bash
cd jobelix
npm test -- --filter=bot
```

## 📚 Further Reading

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Electron IPC](https://www.electronjs.org/docs/latest/tutorial/ipc)
