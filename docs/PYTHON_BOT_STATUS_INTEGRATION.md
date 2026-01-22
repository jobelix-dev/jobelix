# Python Bot Integration - Status Reporting System

## Overview

This document provides detailed instructions for integrating real-time status reporting into the Python auto-apply bot. The system enables the Electron frontend to display live progress updates without polling, using Supabase Realtime.

---

## Architecture

```
Python Bot (Detached Process)
    │
    │ HTTP POST (Token Auth)
    ↓
Next.js API Routes (/api/autoapply/bot/*)
    │
    │ Database Update
    ↓
Supabase bot_sessions Table
    │
    │ Realtime Event (Instant)
    ↓
Electron/Web Frontend (Supabase Subscription)
```

**Key Benefits:**
- **Zero Polling**: Frontend uses Supabase Realtime subscriptions
- **Instant Updates**: Database changes trigger immediate frontend updates (<1s latency)
- **Persistent History**: All sessions stored in database for analytics
- **Graceful Degradation**: HTTP fallback if Realtime fails

---

## Implementation Guide

### Step 1: Add Status Reporter Module

Create `status_reporter.py` in your bot's source directory.

#### StatusReporter Class

**Purpose:** Centralized HTTP client for communicating bot status to backend.

**Responsibilities:**
1. Authenticate with API token (same token used for GPT calls)
2. Manage session lifecycle (start → heartbeats → complete)
3. Track statistics locally and sync to backend
4. Handle network errors gracefully without crashing bot

```python
import requests
import time
from typing import Optional, Dict, Any
from datetime import datetime

class StatusReporter:
    """
    Manages real-time status reporting to Jobelix backend.
    
    All HTTP calls have 10-second timeouts and fail silently to prevent
    bot crashes if backend is temporarily unavailable.
    
    Attributes:
        token (str): User's API token for authentication
        base_url (str): Backend API base URL
        session_id (str | None): Current session ID from backend
        stats (dict): Local statistics cache
    """
    
    def __init__(self, api_token: str, base_url: str = "https://your-app.vercel.app"):
        """
        Initialize the status reporter.
        
        Args:
            api_token: User's API authentication token (from command line)
            base_url: Backend URL (use localhost for dev, production URL for release)
        
        Example:
            reporter = StatusReporter(
                api_token="user_token_xyz",
                base_url="https://jobelix.vercel.app"
            )
        """
        self.token = api_token
        self.base_url = base_url.rstrip('/')
        self.session_id: Optional[str] = None
        self.stats = {
            'jobs_found': 0,
            'jobs_applied': 0,
            'jobs_failed': 0,
            'credits_used': 0
        }
        
    def start_session(self, bot_version: str, platform: str) -> bool:
        """
        Create initial session record in backend database.
        
        This MUST be called before any heartbeats or complete() calls.
        Creates a row in bot_sessions table with status='starting'.
        
        Args:
            bot_version: Bot version string (e.g., "1.0.0", "1.2.3-beta")
            platform: Operating system (e.g., "win32", "darwin", "linux")
        
        Returns:
            True if session created successfully, False otherwise
            
        Side Effects:
            - Sets self.session_id if successful
            - Logs success/failure to console
            
        Backend Behavior:
            - Validates API token
            - Checks for existing running sessions (prevents duplicates)
            - Creates new bot_sessions row
            - Returns session_id for subsequent calls
            
        Example:
            import platform
            
            success = reporter.start_session(
                bot_version="1.0.0",
                platform=platform.system().lower()
            )
            
            if not success:
                print("Warning: Status reporting unavailable")
                # Continue bot execution anyway
        """
        try:
            response = requests.post(
                f"{self.base_url}/api/autoapply/bot/start",
                json={
                    'token': self.token,
                    'bot_version': bot_version,
                    'platform': platform
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.session_id = data.get('session_id')
                print(f"[Status] Session started: {self.session_id}")
                return True
            else:
                print(f"[Status] Failed to start session: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"[Status] Error starting session: {e}")
            return False
    
    def send_heartbeat(
        self, 
        current_activity: str, 
        details: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Update session with current activity and statistics.
        
        This is the core status update method. Call periodically (every 30-60s)
        during bot execution to keep frontend informed.
        
        Args:
            current_activity: Standardized activity identifier (see Activity Codes below)
            details: Optional context-specific data (e.g., company name, job title)
        
        Returns:
            True if heartbeat sent successfully, False otherwise
            
        Backend Behavior:
            - Validates token and session ownership
            - Updates bot_sessions row (triggers Supabase Realtime event)
            - Changes status from 'starting' → 'running' on first heartbeat
            - Checks if user manually stopped session (returns error if stopped)
            - Updates last_heartbeat_at timestamp (used for stale session detection)
            
        Frontend Effect:
            - Realtime subscription receives UPDATE event instantly
            - UI refreshes with new activity message and stats
            - Progress indicators update in <1 second
            
        Important: Always wrap in try-except to prevent bot crashes!
        
        Example:
            # During job search
            reporter.send_heartbeat('searching_jobs', {
                'query': 'Software Engineer',
                'location': 'Remote'
            })
            
            # During application
            reporter.send_heartbeat('creating_resume', {
                'job_title': 'Backend Developer',
                'company': 'Acme Corp'
            })
            
            # In main loop (every 45 seconds)
            if time.time() - last_heartbeat > 45:
                reporter.send_heartbeat('applying_jobs', {
                    'progress': f"{applied}/{total}"
                })
                last_heartbeat = time.time()
        """
        if not self.session_id:
            print("[Status] No session_id, skipping heartbeat")
            return False
            
        try:
            payload = {
                'token': self.token,
                'session_id': self.session_id,
                'activity': current_activity,
                'stats': self.stats.copy()
            }
            
            if details:
                payload['details'] = details
            
            response = requests.post(
                f"{self.base_url}/api/autoapply/bot/heartbeat",
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"[Status] Heartbeat sent: {current_activity}")
                return True
            elif response.status_code == 409:
                # Session was stopped by user
                data = response.json()
                if data.get('stopped'):
                    print("[Status] Session stopped by user - bot should terminate")
                    # Bot should check this and exit gracefully
                return False
            else:
                print(f"[Status] Heartbeat failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"[Status] Error sending heartbeat: {e}")
            return False
    
    def complete_session(
        self, 
        success: bool, 
        error_message: Optional[str] = None
    ):
        """
        Mark session as completed or failed.
        
        This MUST be called when bot finishes execution (success or failure).
        Sets final session state and prevents further heartbeats.
        
        Args:
            success: True if bot completed normally, False if error occurred
            error_message: Error description if success=False (shown to user)
        
        Backend Behavior:
            - Updates status to 'completed' or 'failed'
            - Sets completed_at timestamp
            - Saves final statistics
            - Stores error_message if provided
            
        Frontend Effect:
            - Status card shows final summary
            - "Launch Again" button appears
            - Stats are frozen at final values
            
        Best Practice:
            Always call in try-finally block to ensure completion even if bot crashes.
            
        Example:
            # Normal completion
            reporter.complete_session(success=True)
            
            # Error completion
            try:
                # Bot logic
                pass
            except Exception as e:
                reporter.complete_session(
                    success=False,
                    error_message=f"LinkedIn login failed: {str(e)}"
                )
                raise
        """
        if not self.session_id:
            return
            
        try:
            response = requests.post(
                f"{self.base_url}/api/autoapply/bot/complete",
                json={
                    'token': self.token,
                    'session_id': self.session_id,
                    'success': success,
                    'error_message': error_message,
                    'final_stats': self.stats.copy()
                },
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"[Status] Session completed: {'success' if success else 'failed'}")
            else:
                print(f"[Status] Failed to complete session: {response.status_code}")
                
        except Exception as e:
            print(f"[Status] Error completing session: {e}")
    
    # Statistics increment methods
    
    def increment_jobs_found(self, count: int = 1):
        """
        Increment the count of jobs found during search.
        
        Call after retrieving job listings from LinkedIn search results.
        
        Args:
            count: Number of jobs to add (default: 1)
            
        Example:
            jobs = search_linkedin('Software Engineer', 'Remote')
            reporter.increment_jobs_found(len(jobs))
        """
        self.stats['jobs_found'] += count
        
    def increment_jobs_applied(self, count: int = 1):
        """
        Increment the count of successful applications.
        
        Call after successfully submitting a job application.
        
        Args:
            count: Number of applications to add (default: 1)
            
        Example:
            if apply_to_job(job):
                reporter.increment_jobs_applied()
                reporter.send_heartbeat('application_submitted', {
                    'company': job.company,
                    'job_title': job.title
                })
        """
        self.stats['jobs_applied'] += count
        
    def increment_jobs_failed(self, count: int = 1):
        """
        Increment the count of failed applications.
        
        Call when application fails (timeout, form error, etc).
        
        Args:
            count: Number of failures to add (default: 1)
            
        Example:
            try:
                apply_to_job(job)
            except ApplicationError as e:
                reporter.increment_jobs_failed()
                reporter.send_heartbeat('application_failed', {
                    'job_title': job.title,
                    'error': str(e)
                })
        """
        self.stats['jobs_failed'] += count
        
    def increment_credits_used(self, count: int = 1):
        """
        Increment the count of credits consumed.
        
        Call after each GPT API call (resume generation, question answering).
        
        Args:
            count: Number of credits to add (default: 1)
            
        Note:
            Credits are also deducted server-side by /api/autoapply/gpt4 endpoint.
            This counter is for frontend display only (shows user how many calls made).
            
        Example:
            # After generating resume with GPT
            resume_text = call_gpt_api(prompt)
            reporter.increment_credits_used(1)
            
            # After answering questions
            answers = generate_answers_with_gpt(questions)
            reporter.increment_credits_used(1)
        """
        self.stats['credits_used'] += count
```

---

### Step 2: Activity Codes Reference

Use these standardized activity strings for consistent frontend display:

| Activity Code | When to Use | Frontend Display | Details Object Example |
|--------------|-------------|------------------|----------------------|
| `browser_opening` | Starting Chromium/Playwright | 🌐 Opening Chrome browser... | `None` |
| `browser_opened` | Browser ready | ✅ Browser ready | `None` |
| `linkedin_login` | Entering credentials | 🔐 Logging into LinkedIn... | `None` |
| `linkedin_login_done` | Login successful | ✅ Logged into LinkedIn | `None` |
| `searching_jobs` | Executing search query | 🔍 Searching for matching jobs... | `{'query': 'SWE', 'location': 'Remote'}` |
| `jobs_found` | Search complete | 📋 Jobs retrieved | `{'count': 25}` |
| `creating_resume` | Generating tailored resume | 📄 Generating tailored resume... | `{'job_title': 'SWE', 'company': 'Acme'}` |
| `answering_questions` | Calling GPT for questions | 💬 Answering screening questions... | `{'job_title': 'SWE', 'question_count': 5}` |
| `submitting_application` | Clicking submit | 📤 Submitting application... | `{'company': 'Acme', 'job_title': 'SWE'}` |
| `application_submitted` | Application success | 🎉 Application submitted! | `{'company': 'Acme', 'job_title': 'SWE'}` |
| `application_failed` | Application error | ⚠️ Application encountered error | `{'job_title': 'SWE', 'error': 'Timeout'}` |
| `applying_jobs` | General progress update | ⚡ Applying to jobs... | `{'progress': '3/25'}` |
| `finalizing` | Cleanup/final steps | 🏁 Finishing up... | `None` |

---

### Step 3: Main Bot Integration

Update your main bot file (e.g., `main.py`):

```python
import sys
import platform
import time
from status_reporter import StatusReporter

# Configuration
BOT_VERSION = "1.0.0"  # Update with each release
HEARTBEAT_INTERVAL = 45  # Send heartbeat every 45 seconds
BASE_URL = "https://your-production-url.vercel.app"  # Change for production!

def main():
    """
    Main bot entry point.
    
    Expected command: python main.py --playwright <API_TOKEN>
    """
    # Parse command-line arguments
    if len(sys.argv) < 3 or sys.argv[1] != '--playwright':
        print("Usage: main --playwright <API_TOKEN>")
        sys.exit(1)
    
    api_token = sys.argv[2]
    
    # Initialize status reporter
    reporter = StatusReporter(
        api_token=api_token,
        base_url=BASE_URL
    )
    
    # Start session (non-critical - continue even if fails)
    if not reporter.start_session(BOT_VERSION, platform.system().lower()):
        print("Warning: Failed to start status session. Continuing anyway...")
    
    last_heartbeat = time.time()
    
    try:
        # === PHASE 1: Browser Initialization ===
        reporter.send_heartbeat('browser_opening')
        browser = launch_chromium()  # Your existing function
        reporter.send_heartbeat('browser_opened')
        
        # === PHASE 2: LinkedIn Login ===
        reporter.send_heartbeat('linkedin_login')
        login_to_linkedin(browser)  # Your existing function
        reporter.send_heartbeat('linkedin_login_done')
        
        # === PHASE 3: Job Search ===
        reporter.send_heartbeat('searching_jobs', {
            'query': config['position'],
            'location': config['location']
        })
        
        jobs = search_jobs(browser, config)  # Your existing function
        reporter.increment_jobs_found(len(jobs))
        reporter.send_heartbeat('jobs_found', {'count': len(jobs)})
        
        # === PHASE 4: Application Loop ===
        for i, job in enumerate(jobs):
            # Periodic heartbeat (every 45 seconds)
            if time.time() - last_heartbeat > HEARTBEAT_INTERVAL:
                reporter.send_heartbeat('applying_jobs', {
                    'progress': f"{i}/{len(jobs)}",
                    'current_company': job.company
                })
                last_heartbeat = time.time()
            
            try:
                # Step 4a: Generate tailored resume
                reporter.send_heartbeat('creating_resume', {
                    'job_title': job.title,
                    'company': job.company
                })
                resume = generate_tailored_resume(job)  # Your function
                
                # Step 4b: Answer screening questions with GPT
                if job.has_questions:
                    reporter.send_heartbeat('answering_questions', {
                        'job_title': job.title,
                        'company': job.company
                    })
                    answers = generate_answers_with_gpt(job.questions)  # Your function
                    reporter.increment_credits_used(1)
                else:
                    answers = None
                
                # Step 4c: Submit application
                reporter.send_heartbeat('submitting_application', {
                    'job_title': job.title,
                    'company': job.company
                })
                
                apply_to_job(browser, job, resume, answers)  # Your function
                
                # Success!
                reporter.increment_jobs_applied()
                reporter.send_heartbeat('application_submitted', {
                    'job_title': job.title,
                    'company': job.company
                })
                
            except Exception as e:
                # Application failed
                print(f"Failed to apply to {job.title} at {job.company}: {e}")
                reporter.increment_jobs_failed()
                reporter.send_heartbeat('application_failed', {
                    'job_title': job.title,
                    'company': job.company,
                    'error': str(e)[:100]  # Truncate long errors
                })
        
        # === PHASE 5: Completion ===
        reporter.send_heartbeat('finalizing')
        cleanup_browser(browser)  # Your cleanup function
        
        reporter.complete_session(success=True)
        print(f"✅ Bot completed: {reporter.stats['jobs_applied']} applications submitted")
        
    except Exception as e:
        # Fatal error - report and exit
        print(f"❌ Bot failed with error: {e}")
        reporter.complete_session(
            success=False,
            error_message=str(e)[:200]  # Truncate long errors
        )
        sys.exit(1)
        
    finally:
        # Always cleanup (even if exception)
        try:
            cleanup_browser(browser)
        except:
            pass

if __name__ == "__main__":
    main()
```

---

### Step 4: Configuration

#### Environment Variables (Optional)

Make BASE_URL configurable:

```python
import os

BASE_URL = os.getenv('JOBELIX_API_URL', 'https://your-app.vercel.app')
reporter = StatusReporter(api_token, BASE_URL)
```

#### Development vs Production

```python
# Development (local backend)
BASE_URL = "http://localhost:3000"

# Production (deployed backend)
BASE_URL = "https://your-production-url.vercel.app"
```

---

### Step 5: Error Handling Best Practices

#### Never Let Status Reporting Crash the Bot

```python
# ✅ GOOD: Wrapped in try-except
try:
    reporter.send_heartbeat('searching_jobs')
except Exception as e:
    print(f"Status reporting error (non-critical): {e}")
    # Bot continues execution

# ❌ BAD: Unhandled exception can crash bot
reporter.send_heartbeat('searching_jobs')  # If this fails, bot stops
```

#### Always Complete Session on Exit

```python
try:
    # Main bot logic
    pass
except Exception as e:
    reporter.complete_session(success=False, error_message=str(e))
    raise  # Re-raise to exit with error code
finally:
    # Cleanup code here
    pass
```

---

### Step 6: Manual Stop Detection

The bot should check if user manually stopped the session:

```python
def check_if_stopped(reporter: StatusReporter) -> bool:
    """
    Check if user manually stopped the bot from frontend.
    
    Returns:
        True if session was stopped, False otherwise
    """
    # Heartbeat returns False if session is stopped
    result = reporter.send_heartbeat('applying_jobs', {'checking': True})
    return not result

# In main loop:
for job in jobs:
    if check_if_stopped(reporter):
        print("⚠️ Bot stopped by user - exiting gracefully")
        reporter.complete_session(success=False, error_message="Stopped by user")
        sys.exit(0)
    
    # Continue with application...
```

---

### Step 7: Testing

#### Test Status Reporter Independently

```python
# test_status.py
from status_reporter import StatusReporter
import time

def test_status():
    """Test status reporting without running full bot."""
    token = "your_test_token_here"  # Get from /api/student/token
    reporter = StatusReporter(token, "http://localhost:3000")
    
    print("1. Starting session...")
    reporter.start_session("1.0.0-test", "darwin")
    time.sleep(2)
    
    print("2. Sending browser_opening...")
    reporter.send_heartbeat('browser_opening')
    time.sleep(2)
    
    print("3. Simulating job search...")
    reporter.increment_jobs_found(5)
    reporter.send_heartbeat('jobs_found', {'count': 5})
    time.sleep(2)
    
    print("4. Simulating application...")
    reporter.increment_jobs_applied(3)
    reporter.send_heartbeat('application_submitted', {
        'company': 'Test Corp',
        'job_title': 'Test Engineer'
    })
    time.sleep(2)
    
    print("5. Completing session...")
    reporter.complete_session(success=True)
    
    print(f"✅ Test complete. Final stats: {reporter.stats}")

if __name__ == "__main__":
    test_status()
```

Run with: `python test_status.py`

Frontend should show all updates in real-time!

---

### Step 8: Performance Considerations

#### Heartbeat Frequency Trade-offs

| Interval | Pros | Cons | Recommended For |
|----------|------|------|----------------|
| 30s | Very responsive UI | Higher API calls | Short bot runs (<30 min) |
| 45s | **Balanced** | Moderate API load | **Most use cases** ⭐ |
| 60s | Lower API costs | Slower UI updates | Long bot runs (>1 hour) |
| 90s+ | Minimal API load | Stale appearance | Not recommended |

#### Network Overhead

- Each heartbeat: ~1-2KB payload, ~100-200ms latency
- 45s interval: ~80 API calls per hour
- Negligible impact on bot performance

---

## Summary

### What You've Implemented

✅ Real-time status reporting from detached Python bot  
✅ Instant frontend updates via Supabase Realtime (no polling)  
✅ Manual stop capability from frontend  
✅ Persistent session history in database  
✅ Graceful error handling  
✅ Comprehensive activity tracking  

### Integration Checklist

- [ ] Add `status_reporter.py` to bot source
- [ ] Update `main.py` with reporter integration
- [ ] Configure `BASE_URL` for production
- [ ] Add heartbeat calls at key execution points
- [ ] Implement manual stop checking in main loop
- [ ] Test with `test_status.py` script
- [ ] Update bot version in `main.py`
- [ ] Deploy and monitor first production run

### Next Steps

1. Run local test with `python test_status.py`
2. Launch bot from Electron and watch status card update live
3. Test manual stop button
4. Monitor backend logs for any errors
5. Adjust heartbeat interval based on bot run duration

---

## Troubleshooting

### Frontend Not Updating

1. Check browser console for Realtime subscription errors
2. Verify Supabase Realtime is enabled (migration step)
3. Check backend logs for heartbeat POST requests
4. Test with HTTP status endpoint: `GET /api/autoapply/bot/status`

### "Session Already Running" Error

- Kill previous bot process
- Wait 5 minutes for stale session cleanup
- Or manually update session in database: `UPDATE bot_sessions SET status='completed' WHERE user_id=...`

### Bot Crashes on Status Call

- Ensure all status calls are wrapped in try-except
- Check `BASE_URL` is correct (no trailing slash)
- Verify API token is valid: test with `curl`

