/**
 * WizardStepper Component
 *
 * Compact horizontal step indicator — icon circles only, no labels.
 * Designed to live inline inside the top navigation bar.
 *
 * Circle states:
 * - Completed (past, non-warning): primary bg + Check icon
 * - Active: primary bg + ring
 * - Warning: error bg + step icon
 * - Disabled: muted bg + step icon
 * - Default (future): primary bg + step icon
 */

'use client';

import { useState } from 'react';
import { FileUp, User, Github, Settings, Rocket, Check } from 'lucide-react';

export type WizardStepId = 'resume' | 'github' | 'profile' | 'preferences' | 'auto-apply';

export interface WizardStep {
  id: WizardStepId;
  label: string;
  icon: React.ElementType;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 'resume',      label: 'Resume',      icon: FileUp   },
  { id: 'github',      label: 'GitHub',      icon: Github   },
  { id: 'profile',     label: 'Profile',     icon: User     },
  { id: 'preferences', label: 'Preferences', icon: Settings },
  { id: 'auto-apply',  label: 'Auto Apply',  icon: Rocket   },
];

interface WizardStepperProps {
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick?: (stepIndex: number) => void;
  disabledSteps?: Set<number>;
  warningSteps?: Set<number>;
  stepTooltips?: Record<number, string>;
  allDisabled?: boolean;
}

export default function WizardStepper({
  currentStep,
  completedSteps: _completedSteps,
  onStepClick,
  disabledSteps,
  warningSteps,
  stepTooltips,
  allDisabled = false,
}: WizardStepperProps) {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  return (
    <div className="flex items-center justify-center gap-0">
      {WIZARD_STEPS.map((step, index) => {
        const isActive   = index === currentStep;
        const isPast     = index < currentStep;
        const isDisabled = allDisabled || disabledSteps?.has(index);
        const isWarning  = warningSteps?.has(index) && !isActive;
        const isCompleted = isPast && !isDisabled && !isWarning;
        const tooltip    = stepTooltips?.[index];
        const isClickable = !isDisabled && !!onStepClick;
        const Icon = step.icon;

        let circleClasses: string;
        if (isDisabled) {
          circleClasses = 'bg-background text-muted/40 border border-border/20 opacity-60';
        } else if (isWarning) {
          circleClasses = 'bg-error-subtle text-error border border-error/40';
        } else if (isActive) {
          circleClasses = 'bg-primary text-white shadow-sm shadow-primary/20 ring-[3px] ring-primary/15';
        } else {
          circleClasses = 'bg-primary text-white shadow-sm shadow-primary/20';
        }

        return (
          <div key={step.id} className="flex items-center">
            {/* Step circle */}
            <div
              className="relative z-10"
              onMouseEnter={() => tooltip ? setHoveredStep(index) : undefined}
              onMouseLeave={() => setHoveredStep(null)}
            >
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                aria-label={step.label}
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center
                  transition-all duration-300
                  ${circleClasses}
                  ${isClickable && !isActive ? 'hover:opacity-80' : ''}
                  ${isClickable ? 'cursor-pointer' : isDisabled ? 'cursor-not-allowed' : 'cursor-default'}
                `}
              >
                {isCompleted
                  ? <Check className="w-3.5 h-3.5" />
                  : <Icon className="w-3.5 h-3.5" />
                }
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
              <div className="w-6 sm:w-8 pointer-events-none">
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
