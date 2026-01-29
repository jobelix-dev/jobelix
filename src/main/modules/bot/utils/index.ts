/**
 * Utils - Shared utility modules for the LinkedIn bot
 * 
 * This barrel export provides convenient access to all utility modules.
 * 
 * MODULES:
 * - logger: Logging utilities (createLogger, logger singleton)
 * - status-reporter: Real-time status updates to Electron UI
 * - llm-logger: API call logging and cost tracking
 * - paths: All file path utilities (userData, data folder, resumes, etc.)
 * - debug-html: HTML snapshot saving for debugging
 * - delays: Human-like delay utilities
 * - browser-utils: Browser state detection helpers
 */

export { logger, createLogger } from './logger';
export { statusReporter, StatusReporter } from './status-reporter';
export { llmLogger } from './llm-logger';
export * from './paths';
export * from './debug-html';
export * from './delays';
export * from './browser-utils';
