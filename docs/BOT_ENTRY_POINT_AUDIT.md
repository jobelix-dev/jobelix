# Bot Entry Point and Initialization Audit

**Date**: January 29, 2026  
**Scope**: Entry point and initialization flow comparison between Python and Node.js bots

## Executive Summary

Both bots follow a similar initialization pattern but with key implementation differences. The Node.js bot is more tightly integrated with Electron IPC, while the Python bot runs as a subprocess with stdout/HTTP-based communication.

---

## 1. Entry Points

### Python Bot (`/home/linus/Jobelix/mass/main.py`)

| Aspect | Details |
|--------|---------|
| **Entry Function** | `main()` decorated with `@click.command()` |
| **CLI Arguments** | `--resume`, `--verbose`, `--playwright` (required), `--public_app_url` (required) |
| **Execution** | `python main.py --playwright TOKEN --public_app_url URL` |
| **Process Type** | Standalone subprocess spawned by Electron |

```python
# Lines 409-415
@click.command()
@click.option('--resume', type=click.Path(...), help="Path to the resume PDF file")
@click.option('--verbose', '-v', is_flag=True, default=False, ...)
@click.option('--playwright', type=str, required=True, help="Backend API token (64-char hex token) - REQUIRED")
@click.option('--public_app_url', type=str, required=True, help="Public app URL - REQUIRED")
def main(resume: Path = None, verbose: bool = False, playwright: str = None, public_app_url: str = None):
```

### Node.js Bot (`/home/linus/Jobelix/jobelix/src/main/modules/bot/index.ts`)

| Aspect | Details |
|--------|---------|
| **Entry Class** | `LinkedInBot` class with `initialize()` + `start()` methods |
| **Options Interface** | `BotOptions` with token, apiUrl, configPath, resumePath, verbose, chromiumPath, userDataDir |
| **Execution** | Direct import/instantiation in Electron main process |
| **Process Type** | In-process (runs in Electron main process) |

```typescript
// Lines 46-66
export interface BotOptions {
  token: string;           // Backend API token (64-char hex)
  apiUrl: string;          // Backend API URL
  configPath?: string;     // Path to config.yaml
  resumePath?: string;     // Path to resume.yaml
  verbose?: boolean;       // Enable verbose logging
  chromiumPath?: string;   // Chromium executable path (provided by Electron)
  userDataDir?: string;    // User data directory for browser profile
}
```

### ⚠️ Differences

| Feature | Python | Node.js |
|---------|--------|---------|
| CLI parsing | Click library | Direct options object |
| Optional resume PDF path | ✅ Yes (`--resume`) | ❌ No (only YAML path) |
| Verbose logging flag | ✅ Yes (`--verbose/-v`) | ✅ Yes (`verbose: boolean`) |
| Chromium path override | ❌ Uses env var only | ✅ Explicit option |
| User data dir override | ❌ No | ✅ Yes |

---

## 2. Configuration Loading

### Python Bot

| Step | File | Method |
|------|------|--------|
| 1. Get data folder | `src/utils/paths.py` | `get_app_root() / "data_folder"` |
| 2. Validate folder | `main.py` | `FileManager.validate_data_folder()` |
| 3. Load config | `main.py` | `ConfigValidator.validate_config()` |
| 4. Parse YAML | Built-in | `yaml.safe_load()` |

**Config location**: `{APP_ROOT}/data_folder/config.yaml`

```python
# Lines 498-503 (main.py)
config_file, resume_yaml_file, output_folder = FileManager.validate_data_folder(DATA_FOLDER)
parameters = ConfigValidator.validate_config(config_file)
```

### Node.js Bot

| Step | File | Method |
|------|------|--------|
| 1. Get data folder | `utils/paths.ts` | `getDataFolderPath()` |
| 2. Build config path | `index.ts` | `path.join(dataFolder, 'config.yaml')` |
| 3. Load & validate | `core/config-validator.ts` | `loadAndValidateConfig()` |
| 4. Parse YAML | `js-yaml` | `yaml.load()` |

**Config location**: `{RESOURCES}/{PLATFORM}/main/data_folder/config.yaml`

```typescript
// Lines 99-102 (index.ts)
const dataFolder = getDataFolderPath();
const configPath = options.configPath || path.join(dataFolder, 'config.yaml');
this.config = loadAndValidateConfig(configPath);
```

### ⚠️ Differences

| Feature | Python | Node.js |
|---------|--------|---------|
| Path resolution | `sys.frozen` check for PyInstaller | `app.isPackaged` check for Electron |
| Data folder location | `{APP_ROOT}/data_folder/` | `{RESOURCES}/{PLATFORM}/main/data_folder/` |
| Platform detection | ❌ Same folder all platforms | ✅ Separate folders (mac/win/linux/linux-arch) |
| Arch Linux detection | ❌ No | ✅ Yes (via `/etc/os-release`) |
| Config override | ❌ No | ✅ Via `configPath` option |
| Legacy resume support | ✅ Yes (`plain_text_resume.yaml` fallback) | ❌ No |

---

## 3. Browser/Playwright Initialization

### Python Bot (`src/utils/playwright_browser.py`)

```python
# create_playwright_browser() - Lines 42-73
def create_playwright_browser() -> tuple[Browser, BrowserContext, Page]:
    global _playwright, _browser
    _playwright = sync_playwright().start()
    chromium_executable = get_chromium_executable_path()  # From PLAYWRIGHT_BROWSERS_PATH env
    
    _browser = _playwright.chromium.launch(
        headless=False,
        executable_path=str(chromium_executable),
        args=['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', 
              '--disable-blink-features=AutomationControlled', 
              '--start-maximized', '--start-fullscreen'],
    )
    
    context_options = {'no_viewport': True, 'user_agent': '...'}
    if AUTH_STATE_PATH.exists():
        context_options['storage_state'] = str(AUTH_STATE_PATH)
    
    context = _browser.new_context(**context_options)
    page = context.new_page()
    return _browser, context, page
```

### Node.js Bot (`index.ts` - `launchBrowser()`)

```typescript
// Lines 228-250
private async launchBrowser(): Promise<void> {
  const chromiumPath = this.options?.chromiumPath || getChromiumPath();
  const userDataDir = this.options?.userDataDir || path.join(getDataFolderPath(), '..', 'chrome_profile');

  this.context = await chromium.launchPersistentContext(userDataDir, {
    executablePath: chromiumPath,
    headless: false,
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--no-sandbox',
    ],
  });

  const pages = this.context.pages();
  this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
}
```

### ⚠️ Differences

| Feature | Python | Node.js |
|---------|--------|---------|
| **Launch method** | `chromium.launch()` + `new_context()` | `chromium.launchPersistentContext()` |
| **Session persistence** | Storage state JSON file | Persistent context (user data dir) |
| **Viewport** | `no_viewport: True` (fullscreen) | Fixed `1280x800` |
| **Fullscreen args** | `--start-maximized`, `--start-fullscreen` | ❌ Not included |
| **User agent** | Windows Chrome 120 | macOS Chrome 120 |
| **Auth state loading** | ✅ `storage_state` from JSON | ✅ Implicit via persistent context |
| **GPU disabled** | `--disable-gpu` | ❌ Not included |
| **Dev SHM disabled** | `--disable-dev-shm-usage` | ❌ Not included |

### 🔴 CRITICAL: Session Management Difference

| Python | Node.js |
|--------|---------|
| Creates fresh context each run, optionally loads saved auth state | Uses persistent context that preserves ALL browser data |

**Impact**: Python approach is more explicit about what's persisted; Node.js persists cookies/cache/history automatically.

---

## 4. Authentication/Login Flow

### Python Bot (`src/linkedin/playwright_authenticator.py`)

| Step | Method | Description |
|------|--------|-------------|
| 1 | `start()` | Navigate to `linkedin.com`, check if logged in |
| 2 | `is_logged_in()` | Check URL for `/feed`, `/mynetwork` |
| 3 | `handle_login()` | Navigate to `/login`, wait for user |
| 4 | (loop) | Poll URL every 1s until `/feed` detected |
| 5 | `handle_security_check()` | Wait max 5 minutes for security challenges |

```python
# Polling loop (Lines 109-142)
while True:
    current_url = self.page.url
    if '/feed' in current_url or '/mynetwork' in current_url:
        time.sleep(2)  # Confirm
        current_url = self.page.url
        if '/feed' in current_url or '/mynetwork' in current_url:
            break
    
    # Check nav bar visibility on login page
    if '/login' in current_url:
        nav_bar = self.page.locator('nav.global-nav')
        if nav_bar.is_visible(timeout=1000):
            self.page.goto('https://www.linkedin.com/feed/')
            break
    
    time.sleep(1)  # Poll interval
```

### Node.js Bot (`linkedin/authenticator.ts`)

| Step | Method | Description |
|------|--------|-------------|
| 1 | `start()` | Navigate to `linkedin.com`, check if logged in |
| 2 | `isLoggedIn()` | Check URL patterns |
| 3 | `handleLogin()` | Navigate to `/login`, wait for user |
| 4 | (loop) | Poll URL using `isLoggedInUrl()` |
| 5 | `handleSecurityCheck()` | Wait max 5 minutes for challenges |

```typescript
// Polling loop (Lines 69-121)
while (true) {
  const currentUrl = this.page.url();

  if (this.isLoggedInUrl(currentUrl)) {
    await this.page.waitForTimeout(2000);  // Confirm
    const confirmedUrl = this.page.url();
    if (this.isLoggedInUrl(confirmedUrl)) {
      break;
    }
  }

  if (currentUrl.includes('/login') || currentUrl.includes('/uas/login')) {
    const navBarVisible = await this.isNavBarVisible();
    if (navBarVisible) {
      await this.page.goto('https://www.linkedin.com/feed/');
      break;
    }
  }

  await this.page.waitForTimeout(1000);  // Poll interval
}
```

### ✅ Equivalent Implementation

Both implementations are nearly identical:
- Same URL checks (`/feed`, `/mynetwork`, `/login`)
- Same confirmation delay (2 seconds)
- Same poll interval (1 second)
- Same nav bar fallback detection
- Same security check timeout (5 minutes)

---

## 5. Initial State Setup

### Python Bot

| State | Location | Purpose |
|-------|----------|---------|
| `BOT_VERSION` | `main.py:466` | `"1.0.0"` - Session reporting |
| `resume_object` | `main.py:376` | Loaded from YAML |
| `parameters` | `main.py:503` | Config + uploads + outputDir |
| `seen_jobs` | `playwright_job_manager.py:141` | Empty list `[]` |
| `set_old_answers` | `playwright_job_manager.py:92` | Loaded from CSV |

### Node.js Bot

| State | Location | Purpose |
|-------|----------|---------|
| `BOT_VERSION` | `index.ts:44` | `"2.0.0"` - Session reporting |
| `resume` | `index.ts:107` | Loaded from YAML |
| `config` | `index.ts:102` | Validated config object |
| `seenJobs` | `job-manager.ts:29` | `Set<string>` (empty) |
| `oldAnswers` | `job-manager.ts:30` | Loaded from CSV |

### ⚠️ Differences

| Feature | Python | Node.js |
|---------|--------|---------|
| Bot version | `1.0.0` | `2.0.0` |
| Seen jobs type | `list` | `Set` (more efficient lookups) |
| Config structure | `parameters` dict with `uploads`, `outputFileDirectory` | Separate `config` and `resume` objects |

---

## 6. Status Reporting

### Python Bot (`src/utils/status_reporter.py`)

| Feature | Implementation |
|---------|----------------|
| Transport | HTTP POST to backend API |
| Timeout | 10 seconds per request |
| Endpoints | `/api/autoapply/bot/start`, `/heartbeat`, `/complete` |
| Error handling | Fail silently, continue operation |
| Session cleanup | Auto-cleanup if session already running (409 conflict) |

### Node.js Bot (`utils/status-reporter.ts`)

| Feature | Implementation |
|---------|----------------|
| Transport | Direct Electron IPC (`mainWindow.webContents.send`) |
| Timeout | N/A (direct IPC) |
| Events | `'bot-status'` channel with message types |
| Error handling | Log warning if window destroyed |
| Session cleanup | ❌ Not implemented |

### ⚠️ Differences

| Feature | Python | Node.js |
|---------|--------|---------|
| **Communication** | HTTP REST API | Electron IPC |
| **Session conflict handling** | ✅ Auto-cleanup + retry | ❌ Not implemented |
| **Backend synchronization** | ✅ Via API calls | ❌ UI only (no backend) |
| **Persistent session ID** | ✅ `session_id` from backend | ❌ No session ID |

### 🔴 CRITICAL: Node.js Missing Backend Reporting

The Node.js bot only sends status to the Electron UI via IPC. It does NOT:
- Call `/api/autoapply/bot/start` to create backend session
- Send heartbeats to backend for Supabase Realtime
- Call `/api/autoapply/bot/complete` for final status

**Impact**: Dashboard won't show Node.js bot status in real-time.

---

## 7. Component Initialization Order

### Python Bot

```
main()
  ├── StatusReporter.start_session() ← Creates backend session
  ├── FileManager.validate_data_folder()
  ├── ConfigValidator.validate_config()
  └── create_and_run_bot()
        ├── init_browser() → Playwright browser
        ├── LinkedInAuthenticatorPlaywright(page)
        ├── LinkedInJobManagerPlaywright(page, reporter)
        ├── GPTAnswerer(token, api_url, use_backend=True, reporter)
        ├── Resume(yaml_content, parameters)
        └── LinkedInBotFacade(login, apply, reporter)
              ├── bot.set_resume()
              ├── bot.set_gpt_answerer()
              ├── bot.set_parameters()
              ├── bot.start_login()
              └── bot.start_apply()
```

### Node.js Bot

```
LinkedInBot.initialize(options)
  ├── validateToken()
  ├── loadAndValidateConfig()
  ├── loadResume()
  └── new GPTAnswerer(token, apiUrl, reporter)

LinkedInBot.start(mainWindow)
  ├── statusReporter.setMainWindow()
  ├── statusReporter.startSession() ← UI only, no backend call
  ├── launchBrowser() → Playwright persistent context
  ├── new LinkedInAuthenticator(page, reporter)
  ├── new LinkedInJobManager(page, reporter)
  ├── jobManager.setGptAnswerer()
  ├── jobManager.setParameters()
  ├── authenticator.start()
  └── jobManager.startApplying()
```

---

## 8. Summary of Missing Features

### Node.js Bot Missing

| Feature | Priority | Description |
|---------|----------|-------------|
| Backend session management | 🔴 HIGH | No calls to `/api/autoapply/bot/start`, `/heartbeat`, `/complete` |
| Session conflict handling | 🔴 HIGH | Python cleans up stale sessions; Node.js doesn't |
| Legacy resume format | 🟡 MEDIUM | `plain_text_resume.yaml` fallback |
| Optional PDF resume path | 🟡 MEDIUM | For resume uploads in Easy Apply |
| GPU/DevSHM flags | 🟢 LOW | May improve stability on Linux |
| Fullscreen browser args | 🟢 LOW | `--start-maximized` |

### Python Bot Missing

| Feature | Priority | Description |
|---------|----------|-------------|
| Config path override | 🟢 LOW | Always uses default path |
| Chromium path override | 🟢 LOW | Always uses env var |
| Arch Linux detection | 🟢 LOW | Uses same binary for all Linux |
| Platform-specific data folders | 🟢 LOW | Same folder regardless of platform |

---

## 9. Recommendations

### Immediate Actions (Node.js)

1. **Add backend status reporting** - Create `BackendStatusReporter` that mirrors Python's HTTP-based reporting
2. **Add session cleanup** - Handle 409 conflicts by cleaning up old sessions
3. **Align browser args** - Add `--disable-gpu`, `--disable-dev-shm-usage` for Linux stability

### Future Improvements

1. **Unify path resolution** - Both bots should use consistent data folder structure
2. **Share config schema** - Ensure both validate identical config fields
3. **Version synchronization** - Update Python `BOT_VERSION` to match Node.js or vice versa

---

## Appendix: File Reference

| Component | Python | Node.js |
|-----------|--------|---------|
| Entry point | `main.py` | `src/main/modules/bot/index.ts` |
| Config validator | `main.py:ConfigValidator` | `core/config-validator.ts` |
| Browser init | `src/utils/playwright_browser.py` | `index.ts:launchBrowser()` |
| Authenticator | `src/linkedin/playwright_authenticator.py` | `linkedin/authenticator.ts` |
| Job manager | `src/linkedin/playwright_job_manager.py` | `linkedin/job-manager.ts` |
| Easy applier | `playwright_easy_applier.py` | `linkedin/easy-apply/easy-applier.ts` |
| GPT answerer | `src/ai/gpt_answerer.py` | `ai/gpt-answerer.ts` |
| Status reporter | `src/utils/status_reporter.py` | `utils/status-reporter.ts` |
| Paths | `src/utils/paths.py` | `utils/paths.ts` |
| Resume model | `src/models/resume.py` | `models/resume.ts` |
