/**
 * WizardStepper Component
 * 
 * Horizontal step progress indicator for the wizard.
 * 5 steps: Resume (opt.) → GitHub (opt.) → Profile → Preferences → Auto Apply
 * 
 * Color logic (always shows step's own icon — no checkmarks):
 * - Steps 0-1 (optional): Always green, ring if active
 * - Steps 2-3 (required): Red if in warningSteps, else green, ring if active
 * - Step 4 (Auto Apply): Grey if in disabledSteps, else green, ring if active
 * 
 * Responsive: shows icons + labels on desktop, icons-only on narrow screens.
 */

'use client';

import { useState } from 'react';
import { FileUp, User, Github, Settings, Rocket } from 'lucide-react';

export type WizardStepId = 'resume' | 'github' | 'profile' | 'preferences' | 'auto-apply';

export interface WizardStep {
  id: WizardStepId;
  label: string;
  /** Short label for narrow screens */
  shortLabel: string;
  icon: React.ElementType;
  optional?: boolean;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 'resume',      label: 'Resume',      shortLabel: 'Resume',  icon: FileUp,   optional: true },
  { id: 'github',      label: 'GitHub',      shortLabel: 'GitHub',  icon: Github,   optional: true },
  { id: 'profile',     label: 'Profile',     shortLabel: 'Profile', icon: User },
  { id: 'preferences', label: 'Preferences', shortLabel: 'Prefs',   icon: Settings },
  { id: 'auto-apply',  label: 'Auto Apply',  shortLabel: 'Apply',   icon: Rocket },
];

interface WizardStepperProps {
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick?: (stepIndex: number) => void;
  /** Step indices that are disabled (non-clickable, greyed out) */
  disabledSteps?: Set<number>;
  /** Step indices with warning state (incomplete required steps) */
  warningSteps?: Set<number>;
  /** Tooltip messages per step index (shown on disabled/warning steps) */
  stepTooltips?: Record<number, string>;
  /** When true, ALL stepper buttons are disabled (e.g., during extraction) */
  allDisabled?: boolean;
}

export default function WizardStepper({
  currentStep,
  completedSteps,
  onStepClick,
  disabledSteps,
  warningSteps,
  stepTooltips,
  allDisabled = false,
}: WizardStepperProps) {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  return (
    <div className="relative flex items-start justify-center w-full max-w-xl mx-auto px-2">
      {WIZARD_STEPS.map((step, index) => {
        const isActive = index === currentStep;
        const isPast = index < currentStep;
        const isDisabled = allDisabled || disabledSteps?.has(index);
        const isWarning = warningSteps?.has(index) && !isActive;
        const tooltip = stepTooltips?.[index];

        const isClickable =
          !isDisabled &&
          !!onStepClick;

        const Icon = step.icon;

        // Circle color: role-based, not completion-based
        // Steps 0-1 (optional): always green
        // Steps 2-3 (required): red if warning, else green
        // Step 4 (auto apply): grey if disabled, else green
        let circleClasses: string;
        if (isDisabled) {
          circleClasses = 'bg-background text-muted/40 border border-border/20 opacity-60';
        } else if (isWarning) {
          circleClasses = 'bg-error-subtle text-error border border-error/40';
        } else {
          // Green for all non-disabled, non-warning steps
          circleClasses = 'bg-primary text-white shadow-sm shadow-primary/20';
        }
        // Active ring overlay
        if (isActive && !isDisabled) {
          circleClasses = 'bg-primary text-white shadow-md shadow-primary/25 ring-[3px] ring-primary/15';
        }

        // Label colors follow the same pattern
        let labelClasses: string;
        if (isDisabled) {
          labelClasses = 'text-muted/40';
        } else if (isWarning) {
          labelClasses = 'text-error';
        } else if (isActive) {
          labelClasses = 'text-primary';
        } else {
          labelClasses = 'text-primary/70';
        }

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div
              className="relative z-10"
              onMouseEnter={() => tooltip ? setHoveredStep(index) : undefined}
              onMouseLeave={() => setHoveredStep(null)}
            >
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                className={`
                  flex flex-col items-center gap-1 sm:gap-1.5 group relative
                  ${isClickable ? 'cursor-pointer' : isDisabled ? 'cursor-not-allowed' : 'cursor-default'}
                `}
              >
                {/* Circle */}
                <div
                  className={`
                    w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center
                    transition-all duration-300
                    ${circleClasses}
                    ${isClickable && !isActive ? 'group-hover:border-primary/60 group-hover:text-primary' : ''}
                  `}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Label */}
                <span
                  className={`
                    text-[10px] sm:text-xs font-medium whitespace-nowrap
                    transition-colors duration-200
                    ${labelClasses}
                  `}
                >
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{step.shortLabel}</span>
                  {step.optional && (
                    <span className="hidden sm:inline text-muted/50 font-normal ml-0.5">(opt.)</span>
                  )}
                </span>
              </button>

              {/* Tooltip */}
              {tooltip && hoveredStep === index && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 pointer-events-none">
                  <div className="bg-surface text-default text-xs font-medium px-3 py-2 rounded-lg shadow-lg border border-border/30 whitespace-nowrap">
                    {tooltip}
                  </div>
                </div>
              )}
            </div>

            {/* Connecting line */}
            {index < WIZARD_STEPS.length - 1 && (
              <div className="flex-1 mx-1 sm:mx-2 mt-[-12px] sm:mt-[-14px] pointer-events-none">
                <div className="h-px rounded-full bg-border/30 relative overflow-hidden">
                  <div
                    className={`
                      absolute inset-y-0 left-0 rounded-full
                      transition-all duration-500 ease-out
                      ${isPast ? 'bg-primary w-full' : isActive ? 'bg-primary/40 w-1/2' : 'w-0'}
                    `}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
