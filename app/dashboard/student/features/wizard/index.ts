/**
 * Wizard Feature - Barrel Exports
 * 
 * Entry point for the setup wizard feature.
 * Only export what the parent pages need to consume.
 */

export { default as SetupWizard } from './SetupWizard';
export { useWizardState, STEP, TOTAL_STEPS } from './hooks/useWizardState';
export type { WizardState, WizardActions } from './hooks/useWizardState';
