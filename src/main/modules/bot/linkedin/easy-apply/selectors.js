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
const FORM_SECTIONS = [
  ".jobs-easy-apply-form-section__grouping",
  ".fb-dash-form-element",
  "[data-test-form-element]",
  ".jobs-document-upload",
  ".jobs-resume-picker"
];
const ERROR_SELECTORS = [
  "[data-test-form-element-error-message]",
  ".artdeco-inline-feedback--error",
  ".fb-form-element__error-text",
  '[role="alert"]'
];
const TOAST_ERROR_SELECTOR = '.artdeco-toast-item--visible[data-test-artdeco-toast-item-type="error"]';
const TOAST_MESSAGE_SELECTOR = ".artdeco-toast-item__message";
const JOB_CLOSED_PATTERNS = [
  "job is now closed",
  "job has been closed",
  "no longer accepting applications",
  "position has been filled"
];
const PRIMARY_BUTTONS = [
  "button[data-live-test-easy-apply-next-button]",
  "button[data-live-test-easy-apply-review-button]",
  "button[data-easy-apply-next-button]",
  'button[aria-label="Continue to next step"]',
  'button[aria-label="Submit application"]',
  'button[aria-label="Review your application"]'
];
const SUBMIT_BUTTONS = [
  'button[aria-label="Submit application"]',
  'button[aria-label="Soumettre la candidature"]',
  // French
  'button[aria-label="Enviar solicitud"]',
  // Spanish
  'button[aria-label="Bewerbung absenden"]',
  // German
  'button:has-text("Submit")',
  'button:has-text("Soumettre")',
  // French
  'button:has-text("Enviar")'
  // Spanish
];
const NEXT_BUTTONS = [
  'button[aria-label="Continue to next step"]',
  `button[aria-label="Passer \xE0 l'\xE9tape suivante"]`,
  // French
  'button[aria-label="Continuar al siguiente paso"]',
  // Spanish
  'button:has-text("Next")',
  'button:has-text("Suivant")',
  // French
  'button:has-text("Siguiente")'
  // Spanish
];
const REVIEW_BUTTONS = [
  'button[aria-label="Review your application"]',
  'button[aria-label="V\xE9rifier votre candidature"]',
  // French
  'button[aria-label="Revisar tu solicitud"]',
  // Spanish
  'button:has-text("Review")',
  'button:has-text("V\xE9rifier")',
  // French
  'button:has-text("Revisar")'
  // Spanish
];
const DOCUMENT_UPLOAD = {
  container: ".js-jobs-document-upload__container",
  resumeSection: ".jobs-document-upload, .jobs-resume-picker",
  fileInput: 'input[type="file"]',
  uploadButton: "button.jobs-document-upload__upload-button"
};
const TIMEOUTS = {
  /** Short wait for UI transitions */
  short: 150,
  /** Medium wait for animations */
  medium: 500,
  /** Long wait for network requests */
  long: 1e3,
  /** Extra long wait for file uploads */
  upload: 2e3,
  /** Wait between typing characters */
  typing: 50
};
export {
  ALREADY_APPLIED_SELECTORS,
  DOCUMENT_UPLOAD,
  EASY_APPLY_BUTTON_SELECTORS,
  ERROR_SELECTORS,
  FORM_SECTIONS,
  JOB_CLOSED_PATTERNS,
  JOB_DESCRIPTION_SELECTORS,
  MODAL,
  NEXT_BUTTONS,
  PRIMARY_BUTTONS,
  REVIEW_BUTTONS,
  SUBMIT_BUTTONS,
  TIMEOUTS,
  TOAST_ERROR_SELECTOR,
  TOAST_MESSAGE_SELECTOR
};
//# sourceMappingURL=selectors.js.map
