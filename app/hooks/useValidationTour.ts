/**
 * useValidationTour Hook
 * 
 * Generic hook for managing validation tour state and navigation.
 * Used by both profile and work preferences tours.
 */

'use client';

import { useState, useCallback } from 'react';
import { ValidationTourStep } from '@/app/dashboard/student/components/ValidationTour';

export interface UseValidationTourOptions {
  /** Function that returns the current active steps based on validation state */
  getActiveSteps: () => ValidationTourStep[];
  /** The completion step to show when all errors are fixed */
  completionStep: ValidationTourStep;
  /** Optional callback when exiting the tour */
  onExit?: () => void;
  /** Optional callback when a step changes (for closing modals, etc.) */
  onStepChange?: (step: ValidationTourStep | undefined, prevStep: ValidationTourStep | undefined) => void;
}

export interface UseValidationTourReturn {
  /** Whether the tour is currently open */
  isOpen: boolean;
  /** Current tour steps */
  steps: ValidationTourStep[];
  /** Current step index */
  currentIndex: number;
  /** Start the tour */
  start: () => void;
  /** Go to next step */
  next: () => void;
  /** Go to previous step */
  back: () => void;
  /** Exit the tour */
  exit: () => void;
  /** Current step (for convenience) */
  currentStep: ValidationTourStep | undefined;
  /** Whether we're on the completion step */
  isComplete: boolean;
}

export function useValidationTour({
  getActiveSteps,
  completionStep,
  onExit,
  onStepChange,
}: UseValidationTourOptions): UseValidationTourReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [steps, setSteps] = useState<ValidationTourStep[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentStep = steps[currentIndex];
  const isComplete = steps[0]?.id === 'complete';

  const start = useCallback(() => {
    const activeSteps = getActiveSteps();
    if (activeSteps.length === 0) return;
    
    setSteps(activeSteps);
    setCurrentIndex(0);
    setIsOpen(true);
  }, [getActiveSteps]);

  const next = useCallback(() => {
    const activeSteps = getActiveSteps();
    const currentId = steps[currentIndex]?.id;
    const currentIndexInActive = currentId
      ? activeSteps.findIndex((step) => step.id === currentId)
      : -1;
    const nextIndex = currentIndexInActive >= 0 ? currentIndexInActive + 1 : 0;

    const prevStep = steps[currentIndex];

    // All errors fixed or we've gone through all steps
    if (activeSteps.length === 0 || nextIndex >= activeSteps.length) {
      setSteps([completionStep]);
      setCurrentIndex(0);
      onStepChange?.(completionStep, prevStep);
      return;
    }

    setSteps(activeSteps);
    setCurrentIndex(nextIndex);
    onStepChange?.(activeSteps[nextIndex], prevStep);
  }, [getActiveSteps, steps, currentIndex, completionStep, onStepChange]);

  const back = useCallback(() => {
    const activeSteps = getActiveSteps();
    const prevStep = steps[currentIndex];

    // Going back from completion step
    if (isComplete) {
      if (activeSteps.length > 0) {
        setSteps(activeSteps);
        setCurrentIndex(activeSteps.length - 1);
        onStepChange?.(activeSteps[activeSteps.length - 1], prevStep);
      }
      return;
    }

    const currentId = steps[currentIndex]?.id;
    const currentIndexInActive = currentId
      ? activeSteps.findIndex((step) => step.id === currentId)
      : -1;
    const prevIndex = currentIndexInActive > 0 ? currentIndexInActive - 1 : 0;

    setSteps(activeSteps);
    setCurrentIndex(prevIndex);
    onStepChange?.(activeSteps[prevIndex], prevStep);
  }, [getActiveSteps, steps, currentIndex, isComplete, onStepChange]);

  const exit = useCallback(() => {
    setIsOpen(false);
    setSteps([]);
    setCurrentIndex(0);
    onExit?.();
  }, [onExit]);

  return {
    isOpen,
    steps,
    currentIndex,
    currentStep,
    isComplete,
    start,
    next,
    back,
    exit,
  };
}
