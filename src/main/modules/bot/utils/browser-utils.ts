/**
 * Browser Utilities - Shared browser/Playwright helpers
 * 
 * Contains utility functions used across multiple components
 * for browser state detection and error handling.
 */

/**
 * Check if an error indicates the browser was closed
 * 
 * This is used throughout the bot to gracefully handle cases where
 * the user closes the browser window during operation.
 * 
 * @param error - The error to check
 * @returns True if the error indicates browser closure
 * 
 * @example
 * ```typescript
 * try {
 *   await page.goto(url);
 * } catch (error) {
 *   if (isBrowserClosed(error)) {
 *     console.log('User closed the browser');
 *     return;
 *   }
 *   throw error;
 * }
 * ```
 */
export function isBrowserClosed(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Target page, context or browser has been closed') ||
    message.includes('Target closed') ||
    message.includes('Browser closed')
  );
}
