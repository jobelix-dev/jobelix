/**
 * Bot Status Constants
 * Centralized configuration for bot status tracking and UI behavior
 */

// Timing constants (in milliseconds)
export const PROGRESS_SIMULATION_INTERVAL_MS = 150;
export const SIMULATED_INSTALL_DURATION_MS = 15_000;
export const POLLING_INTERVAL_MS = 5_000; // Reduced from 2s to 5s to minimize auth requests
export const ERROR_DISPLAY_DURATION_MS = 5_000;

// Log limits
export const MAX_LOGS_TO_DISPLAY = 8;
export const MAX_LOGS_IN_MEMORY = 200;

// Activity messages for user-friendly display
export const ACTIVITY_MESSAGES: Record<string, string> = {
  'browser_opening': '🌐 Opening Chrome browser...',
  'browser_opened': '✅ Browser ready',
  'linkedin_login': '🔐 Logging into LinkedIn...',
  'linkedin_login_done': '✅ Logged into LinkedIn',
  'searching_jobs': '🔍 Searching for matching jobs...',
  'jobs_found': '📋 Jobs retrieved',
  'creating_resume': '📄 Generating tailored resume...',
  'answering_questions': '💬 Answering screening questions...',
  'submitting_application': '📤 Submitting application...',
  'application_submitted': '🎉 Application submitted!',
  'application_failed': '⚠️ Application encountered error',
  'applying_jobs': '⚡ Applying to jobs...',
  'finalizing': '🏁 Finishing up...',
};
