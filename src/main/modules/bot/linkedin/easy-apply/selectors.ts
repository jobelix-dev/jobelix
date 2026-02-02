/**
 * LinkedIn Easy Apply Selectors
 * Centralized selector constants for consistency and easier maintenance
 */

/** Easy Apply button selectors (international support) */
export const EASY_APPLY_BUTTON_SELECTORS = [
  '[data-view-name="job-apply-button"]',           // Most reliable
  'button.jobs-apply-button',                       // English button
  'a[aria-label*="Easy Apply"]',                   // English link
  'a[aria-label*="Candidature simplifiée"]',       // French
  'button[aria-label*="Postuler"]',                // French button
  'a[aria-label*="Candidatar"]',                   // Spanish
  'button[aria-label*="Bewerben"]',                // German
  'button[data-control-name="jobdetails_topcard_inapply"]',
  '.jobs-s-apply button',
];

/** Already applied indicators (international support) */
export const ALREADY_APPLIED_SELECTORS = [
  '.jobs-details-top-card__apply-status--applied',
  'span:has-text("Applied")',
  'span:has-text("Application sent")',
  'span:has-text("Candidature envoyée")',          // French
  'span:has-text("Candidatura enviada")',          // Spanish
  'span:has-text("Bewerbung gesendet")',           // German
  '.artdeco-inline-feedback--success:has-text("Applied")',
];

/** Job description selectors (in order of priority) */
export const JOB_DESCRIPTION_SELECTORS = [
  'span[data-testid="expandable-text-box"]',       // Current LinkedIn (Nov 2025)
  '#job-details',                                   // Older unified pane
  'article.jobs-description__container .jobs-box__html-content',
  'div.jobs-description-content__text--stretch',
  'div.jobs-description',
];

/** Modal selectors */
export const MODAL = {
  container: 'div.jobs-easy-apply-modal',
  footer: 'div.jobs-easy-apply-modal footer, footer.jobs-easy-apply-modal__footer',
};

/** Form section selectors - containers for form fields */
export const FORM_SECTIONS = [
  '.jobs-easy-apply-form-section__grouping',
  '.fb-dash-form-element',
  '[data-test-form-element]',
  '.jobs-document-upload',
  '.jobs-resume-picker',
] as const;

/** Validation error selectors (inline form errors) */
export const ERROR_SELECTORS = [
  '[data-test-form-element-error-message]',
  '.artdeco-inline-feedback--error',
  '.fb-form-element__error-text',
  '[role="alert"]',
] as const;

/** Toast error selectors (global notifications) */
export const TOAST_ERROR_SELECTOR = '.artdeco-toast-item--visible[data-test-artdeco-toast-item-type="error"]';
export const TOAST_MESSAGE_SELECTOR = '.artdeco-toast-item__message';

/** Job closed error patterns */
export const JOB_CLOSED_PATTERNS = [
  'job is now closed',
  'job has been closed',
  'no longer accepting applications',
  'position has been filled',
] as const;

/** Primary action buttons */
export const PRIMARY_BUTTONS = [
  'button[data-live-test-easy-apply-next-button]',
  'button[data-live-test-easy-apply-review-button]',
  'button[data-easy-apply-next-button]',
  'button[aria-label="Continue to next step"]',
  'button[aria-label="Submit application"]',
  'button[aria-label="Review your application"]',
] as const;

/** Submit button selectors (international support) */
export const SUBMIT_BUTTONS = [
  'button[aria-label="Submit application"]',
  'button[aria-label="Soumettre la candidature"]',  // French
  'button[aria-label="Enviar solicitud"]',          // Spanish
  'button[aria-label="Bewerbung absenden"]',        // German
  'button:has-text("Submit")',
  'button:has-text("Soumettre")',                   // French
  'button:has-text("Enviar")',                      // Spanish
] as const;

/** Next/Continue button selectors (international support) */
export const NEXT_BUTTONS = [
  'button[aria-label="Continue to next step"]',
  'button[aria-label="Passer à l\'étape suivante"]', // French
  'button[aria-label="Continuar al siguiente paso"]', // Spanish
  'button:has-text("Next")',
  'button:has-text("Suivant")',                      // French
  'button:has-text("Siguiente")',                    // Spanish
] as const;

/** Review button selectors (international support) */
export const REVIEW_BUTTONS = [
  'button[aria-label="Review your application"]',
  'button[aria-label="Vérifier votre candidature"]', // French
  'button[aria-label="Revisar tu solicitud"]',       // Spanish
  'button:has-text("Review")',
  'button:has-text("Vérifier")',                     // French
  'button:has-text("Revisar")',                      // Spanish
] as const;

/** Document upload container selectors */
export const DOCUMENT_UPLOAD = {
  container: '.js-jobs-document-upload__container',
  resumeSection: '.jobs-document-upload, .jobs-resume-picker',
  fileInput: 'input[type="file"]',
  uploadButton: 'button.jobs-document-upload__upload-button',
} as const;

/** Timeouts in milliseconds */
export const TIMEOUTS = {
  /** Short wait for UI transitions */
  short: 150,
  /** Medium wait for animations */
  medium: 500,
  /** Long wait for network requests */
  long: 1000,
  /** Extra long wait for file uploads */
  upload: 2000,
  /** Wait between typing characters */
  typing: 50,
} as const;
