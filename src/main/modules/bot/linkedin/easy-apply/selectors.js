const EASY_APPLY_BUTTON_SELECTORS = [
  '[data-view-name="job-apply-button"]',
  // Most reliable
  "button.jobs-apply-button",
  // English button
  'a[aria-label*="Easy Apply"]',
  // English link
  'a[aria-label*="Candidature simplifi\xE9e"]',
  // French
  'button[aria-label*="Postuler"]',
  // French button
  'a[aria-label*="Candidatar"]',
  // Spanish
  'button[aria-label*="Bewerben"]',
  // German
  'button[data-control-name="jobdetails_topcard_inapply"]',
  ".jobs-s-apply button"
];
const ALREADY_APPLIED_SELECTORS = [
  ".jobs-details-top-card__apply-status--applied",
  'span:has-text("Applied")',
  'span:has-text("Application sent")',
  'span:has-text("Candidature envoy\xE9e")',
  // French
  'span:has-text("Candidatura enviada")',
  // Spanish
  'span:has-text("Bewerbung gesendet")',
  // German
  '.artdeco-inline-feedback--success:has-text("Applied")'
];
const JOB_DESCRIPTION_SELECTORS = [
  'span[data-testid="expandable-text-box"]',
  // Current LinkedIn (Nov 2025)
  "#job-details",
  // Older unified pane
  "article.jobs-description__container .jobs-box__html-content",
  "div.jobs-description-content__text--stretch",
  "div.jobs-description"
];
const MODAL = {
  container: "div.jobs-easy-apply-modal",
  footer: "div.jobs-easy-apply-modal footer, footer.jobs-easy-apply-modal__footer"
};
export {
  ALREADY_APPLIED_SELECTORS,
  EASY_APPLY_BUTTON_SELECTORS,
  JOB_DESCRIPTION_SELECTORS,
  MODAL
};
//# sourceMappingURL=selectors.js.map
