const DELAYS = {
  /** Very short delay for immediate responses (200-400ms) */
  INSTANT: { min: 200, max: 400 },
  /** Short delay for form field changes (300-600ms) */
  FIELD: { min: 300, max: 600 },
  /** Medium delay for button clicks (500-1000ms) */
  CLICK: { min: 500, max: 1e3 },
  /** Delay for page transitions (1000-2000ms) */
  PAGE_TRANSITION: { min: 1e3, max: 2e3 },
  /** Delay between job applications (3000-6000ms) */
  BETWEEN_JOBS: { min: 3e3, max: 6e3 },
  /** Long delay for page loads (2000-4000ms) */
  PAGE_LOAD: { min: 2e3, max: 4e3 },
  /** Very long delay between search pages (9000-12000ms) */
  BETWEEN_PAGES: { min: 9e3, max: 12e3 }
};
function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
async function waitRandom(page, range) {
  const delay = randomDelay(range.min, range.max);
  await page.waitForTimeout(delay);
}
async function wait(page, ms) {
  await page.waitForTimeout(ms);
}
async function waitField(page) {
  await waitRandom(page, DELAYS.FIELD);
}
async function waitClick(page) {
  await waitRandom(page, DELAYS.CLICK);
}
async function waitPageTransition(page) {
  await waitRandom(page, DELAYS.PAGE_TRANSITION);
}
async function waitBetweenJobs(page) {
  await waitRandom(page, DELAYS.BETWEEN_JOBS);
}
async function waitBetweenPages(page) {
  await waitRandom(page, DELAYS.BETWEEN_PAGES);
}
export {
  DELAYS,
  randomDelay,
  wait,
  waitBetweenJobs,
  waitBetweenPages,
  waitClick,
  waitField,
  waitPageTransition,
  waitRandom
};
//# sourceMappingURL=delays.js.map
