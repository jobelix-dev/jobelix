/**
 * Hook for managing work preferences tour
 */

import { useState, Dispatch, SetStateAction } from 'react';
import { ValidationTourStep } from '@/app/dashboard/student/components/ValidationTour';
import { ValidationErrors } from '../types';

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

export const completionStep: ValidationTourStep = {
  id: 'complete',
  targetId: 'save-preferences-button',
  title: 'Save now',
  message: 'All set - you can save now.',
};

export function useWorkPreferencesTour(
  getValidationPreferences: () => any,
  getValidationErrors: (prefs: any) => ValidationErrors,
  setShowAdvanced: Dispatch<SetStateAction<boolean>>
) {
  const [tourOpen, setTourOpen] = useState(false);
  const [tourSteps, setTourSteps] = useState<ValidationTourStep[]>([]);
  const [tourIndex, setTourIndex] = useState(0);

  const getActiveSteps = () => {
    const prefsToValidate = getValidationPreferences();
    return buildValidationTourSteps(getValidationErrors(prefsToValidate), setShowAdvanced);
  };

  const handleTourNext = () => {
    const activeSteps = getActiveSteps();
    const currentId = tourSteps[tourIndex]?.id;
    const currentIndexInActive = currentId
      ? activeSteps.findIndex((step) => step.id === currentId)
      : -1;
    const nextIndex = currentIndexInActive >= 0 ? currentIndexInActive + 1 : 0;

    if (activeSteps.length === 0) {
      setTourSteps([completionStep]);
      setTourIndex(0);
      return;
    }

    if (nextIndex >= activeSteps.length) {
      setTourSteps([completionStep]);
      setTourIndex(0);
      return;
    }

    setTourSteps(activeSteps);
    setTourIndex(nextIndex);
  };

  const handleTourBack = () => {
    const activeSteps = getActiveSteps();
    const isComplete = tourSteps[0]?.id === 'complete';

    if (isComplete) {
      if (activeSteps.length > 0) {
        setTourSteps(activeSteps);
        setTourIndex(activeSteps.length - 1);
      }
      return;
    }

    const currentId = tourSteps[tourIndex]?.id;
    const currentIndexInActive = currentId
      ? activeSteps.findIndex((step) => step.id === currentId)
      : -1;
    const prevIndex = currentIndexInActive > 0 ? currentIndexInActive - 1 : 0;

    setTourSteps(activeSteps);
    setTourIndex(prevIndex);
  };

  const handleTourExit = () => {
    setTourOpen(false);
    setTourSteps([]);
    setTourIndex(0);
  };

  const startTour = (errors: ValidationErrors) => {
    const steps = buildValidationTourSteps(errors, setShowAdvanced);
    setTourSteps(steps);
    setTourIndex(0);
    setTourOpen(true);
  };

  return {
    tourOpen,
    tourSteps,
    tourIndex,
    setTourOpen,
    setTourSteps,
    setTourIndex,
    handleTourNext,
    handleTourBack,
    handleTourExit,
    startTour,
    getActiveSteps,
  };
}
