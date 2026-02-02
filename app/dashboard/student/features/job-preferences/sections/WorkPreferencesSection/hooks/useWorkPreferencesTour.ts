/**
 * Hook for managing work preferences tour
 * 
 * Uses the generic useValidationTour hook with work preferences-specific
 * step building logic.
 */

import { Dispatch, SetStateAction, useCallback } from 'react';
import { ValidationTourStep } from '@/app/dashboard/student/components/ValidationTour';
import { useValidationTour } from '@/app/hooks';
import { ValidationErrors } from '../types';

/**
 * Builds tour steps from work preferences validation errors
 */
export const buildValidationTourSteps = (
  errors: ValidationErrors,
  setShowAdvanced: Dispatch<SetStateAction<boolean>>
): ValidationTourStep[] => {
  const steps: ValidationTourStep[] = [];

  if (errors.positions) {
    steps.push({
      id: 'positions',
      targetId: 'job-pref-positions',
      targetIds: ['job-pref-positions', 'job-pref-positions-add'],
      title: 'Add a position',
      message: 'Enter at least one target position.',
    });
  }

  if (errors.locations) {
    steps.push({
      id: 'locations',
      targetId: 'job-pref-locations',
      targetIds: ['job-pref-locations', 'job-pref-locations-add'],
      title: 'Choose a location',
      message: 'Enter at least one location.',
    });
  }

  if (errors.experience) {
    steps.push({
      id: 'experience',
      targetId: 'job-pref-experience',
      title: 'Select experience level',
      message: 'Choose at least one experience level.',
    });
  }

  if (errors.jobType) {
    steps.push({
      id: 'jobType',
      targetId: 'job-pref-job-types',
      title: 'Select job type',
      message: 'Choose at least one job type.',
    });
  }

  if (errors.dateFilter) {
    steps.push({
      id: 'dateFilter',
      targetId: 'job-pref-date-filters',
      title: 'Choose a date range',
      message: 'Select at least one date filter.',
      onBefore: () => setShowAdvanced(true),
    });
  }

  if (errors.workAuthorization) {
    steps.push({
      id: 'workAuthorization',
      targetId: 'job-pref-work-authorization',
      title: 'Select work authorization',
      message: 'Choose where you can work.',
      onBefore: () => setShowAdvanced(true),
    });
  }

  if (errors.notice_period) {
    steps.push({
      id: 'notice_period',
      targetId: 'job-pref-notice-period',
      title: 'Enter notice period',
      message: 'Tell us your notice period.',
      onBefore: () => setShowAdvanced(true),
    });
  }

  if (errors.salary_expectation_usd) {
    steps.push({
      id: 'salary_expectation_usd',
      targetId: 'job-pref-salary',
      title: 'Enter salary expectation',
      message: 'Enter a salary greater than 0.',
      onBefore: () => setShowAdvanced(true),
    });
  }

  if (errors.date_of_birth) {
    steps.push({
      id: 'date_of_birth',
      targetId: 'job-pref-date-of-birth',
      title: 'Enter date of birth',
      message: 'Select your date of birth.',
      onBefore: () => setShowAdvanced(true),
    });
  }

  if (errors.pronouns) {
    steps.push({
      id: 'pronouns',
      targetId: 'job-pref-pronouns',
      title: 'Enter pronouns',
      message: 'Type your pronouns.',
      onBefore: () => setShowAdvanced(true),
    });
  }

  if (errors.gender) {
    steps.push({
      id: 'gender',
      targetId: 'job-pref-gender',
      title: 'Enter gender',
      message: 'Type your gender.',
      onBefore: () => setShowAdvanced(true),
    });
  }

  if (errors.ethnicity) {
    steps.push({
      id: 'ethnicity',
      targetId: 'job-pref-ethnicity',
      title: 'Enter ethnicity',
      message: 'Type your ethnicity.',
      onBefore: () => setShowAdvanced(true),
    });
  }

  return steps;
};

const COMPLETION_STEP: ValidationTourStep = {
  id: 'complete',
  targetId: 'save-preferences-button',
  title: 'Save now',
  message: 'All set - you can save now.',
};

export function useWorkPreferencesTour<T>(
  getValidationPreferences: () => T,
  getValidationErrors: (prefs: T) => ValidationErrors,
  setShowAdvanced: Dispatch<SetStateAction<boolean>>
) {
  const getActiveSteps = useCallback(() => {
    const prefsToValidate = getValidationPreferences();
    return buildValidationTourSteps(getValidationErrors(prefsToValidate), setShowAdvanced);
  }, [getValidationPreferences, getValidationErrors, setShowAdvanced]);

  const tour = useValidationTour({
    getActiveSteps,
    completionStep: COMPLETION_STEP,
  });

  const startTour = useCallback((errors: ValidationErrors) => {
    const steps = buildValidationTourSteps(errors, setShowAdvanced);
    if (steps.length > 0) {
      tour.start();
    }
  }, [setShowAdvanced, tour]);

  // Return backward-compatible API
  return {
    tourOpen: tour.isOpen,
    tourSteps: tour.steps,
    tourIndex: tour.currentIndex,
    setTourOpen: () => {}, // Not needed with new API, kept for compatibility
    setTourSteps: () => {}, // Not needed with new API, kept for compatibility
    setTourIndex: () => {}, // Not needed with new API, kept for compatibility
    handleTourNext: tour.next,
    handleTourBack: tour.back,
    handleTourExit: tour.exit,
    startTour,
    getActiveSteps,
  };
}
