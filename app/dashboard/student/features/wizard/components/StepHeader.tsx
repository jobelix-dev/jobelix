/**
 * StepHeader Component
 * 
 * Shared header for each wizard step.
 * Renders: [Back button] — [Title + subtitle] — [Continue button]
 * 
 * Back/Continue buttons are inline with the title so the user doesn't
 * need to scroll to the bottom to navigate.
 */

'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';

/** Shared navigation props that each step component receives from SetupWizard */
export interface StepNavProps {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  stepsDisabled?: boolean;
}

interface StepHeaderProps {
  /** Step title */
  title: string;
  /** Optional subtitle below the title */
  subtitle?: string;
  /** Back button click handler. If undefined, back button is hidden. */
  onBack?: () => void;
  /** Next/Continue button click handler */
  onNext?: () => void;
  /** Label for the next button */
  nextLabel?: string;
  /** Whether the next button is disabled */
  nextDisabled?: boolean;
  /** Whether all navigation is disabled (e.g., during processing) */
  allDisabled?: boolean;
  /** Whether to show the back button */
  showBack?: boolean;
  /** Whether to hide the next button entirely (e.g., Auto Apply step) */
  hideNext?: boolean;
}

export default function StepHeader({
  title,
  subtitle,
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
  allDisabled = false,
  showBack = true,
  hideNext = false,
}: StepHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 mb-6">
      {/* Back button */}
      <div className="w-28 flex-shrink-0">
        {showBack && onBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={allDisabled}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted 
              hover:text-default hover:bg-primary-subtle/40 rounded-lg transition-colors cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        ) : (
          <div />
        )}
      </div>

      {/* Title + subtitle */}
      <div className="text-center flex-1 min-w-0">
        <h2 className="text-xl sm:text-2xl font-bold text-default">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted mt-1 max-w-md mx-auto">{subtitle}</p>
        )}
      </div>

      {/* Next / Continue button */}
      <div className="w-28 flex-shrink-0 flex justify-end">
        {!hideNext && onNext ? (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled || allDisabled}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium 
              bg-primary hover:bg-primary-hover text-white rounded-lg 
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {nextLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
