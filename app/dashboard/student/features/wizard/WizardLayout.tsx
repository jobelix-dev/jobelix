/**
 * WizardLayout Component
 * 
 * Main shell for the wizard. Contains:
 * - Top bar with logo and dropdown menu
 * - Step progress indicator
 * - Central content area for step components
 * 
 * Navigation (back/continue) is handled by each step via StickyActionBar.
 * Credits management is accessed from within the AutoApply step.
 * The dropdown menu provides access to Feedback, Privacy, Settings, and Logout.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, MessageSquare, Shield, Settings, LogOut } from 'lucide-react';
import WizardStepper from './components/WizardStepper';

interface WizardLayoutProps {
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
  /** When true, ALL stepper buttons are disabled (e.g., during extraction) */
  stepsDisabled?: boolean;
  /** Step indices that are individually disabled in stepper */
  disabledSteps?: Set<number>;
  /** Step indices with warning state in stepper */
  warningSteps?: Set<number>;
  /** Tooltip messages per step index */
  stepTooltips?: Record<number, string>;
  /** Header dropdown callbacks */
  onFeedback?: () => void;
  onPrivacy?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
  children: React.ReactNode;
}

export default function WizardLayout({
  currentStep,
  completedSteps,
  onStepClick,
  stepsDisabled = false,
  disabledSteps,
  warningSteps,
  stepTooltips,
  onFeedback,
  onPrivacy,
  onSettings,
  onLogout,
  children,
}: WizardLayoutProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div className="min-h-screen bg-background flex flex-col isolate">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-surface/95 backdrop-blur-sm border-b border-border/20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Left: Logo */}
            <h1 className="text-lg font-bold text-default">Jobelix</h1>

            {/* Right: Dropdown menu */}
            <div className="flex items-center gap-2">
              {/* Dropdown menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-lg text-muted hover:text-default hover:bg-primary-subtle/50 transition-colors cursor-pointer"
                  aria-label="Menu"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-surface rounded-xl shadow-lg border border-border/30 py-1 z-[100]">
                    {onFeedback && (
                      <button
                        onClick={() => { onFeedback(); setShowMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-default hover:bg-primary-subtle/50 active:bg-primary-subtle/50 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4 text-muted" />
                        Feedback
                      </button>
                    )}
                    {onPrivacy && (
                      <button
                        onClick={() => { onPrivacy(); setShowMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-default hover:bg-primary-subtle/50 active:bg-primary-subtle/50 transition-colors cursor-pointer"
                      >
                        <Shield className="w-4 h-4 text-muted" />
                        Privacy
                      </button>
                    )}
                    {onSettings && (
                      <button
                        onClick={() => { onSettings(); setShowMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-default hover:bg-primary-subtle/50 active:bg-primary-subtle/50 transition-colors cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-muted" />
                        Settings
                      </button>
                    )}
                    {onLogout && (
                      <>
                        <div className="h-px bg-border/20 my-1" />
                        <button
                          onClick={() => { onLogout(); setShowMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-error-subtle/30 active:bg-error-subtle/30 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          Log out
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper — relative + z-20 ensures it sits above the content area */}
      <div className="relative z-20 py-6 sm:py-8 px-4">
        <WizardStepper
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={onStepClick}
          disabledSteps={disabledSteps}
          warningSteps={warningSteps}
          stepTooltips={stepTooltips}
          allDisabled={stepsDisabled}
        />
      </div>

      {/* Central content area — z-0 isolates it below the stepper's z-20 */}
      <div className="relative z-0 flex-1 flex flex-col items-center px-4 sm:px-6 pb-6">
        <div className="w-full max-w-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
