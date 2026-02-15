/**
 * SetupWizard Orchestrator
 * 
 * Top-level wizard component — the entire student app experience.
 * 
 * Wires together:
 * - useWizardState (navigation, step tracking, server-derived state, beforeLeave guard)
 * - useProfileData (draft loading, auto-save, validation, finalization)
 * - useResumeUpload (file upload, AI extraction with SSE progress)
 * - useGitHubImportDashboard (GitHub OAuth + import with SSE progress)
 * 
 * 5 steps: Resume(0) → GitHub(1) → Profile(2) → Preferences(3) → Auto Apply(4)
 * 
 * UX behaviors:
 * - Resume & GitHub: Continue marks completed + advances
 * - Stepper + nav disabled during extraction
 * - Continue = Save on Profile step (tour-aware via saveRef)
 * - Continue = Save on Preferences step (tour-aware via saveRef)
 * - Leaving Profile/Preferences via stepper auto-triggers save (tour if invalid)
 * - All stepper tabs clickable at any time (except when allDisabled during extraction)
 * - Auto Apply greyed out in stepper when profile/prefs incomplete
 * - Red/error color on incomplete required steps when not active
 */

'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useWizardState, STEP } from './hooks/useWizardState';
import type { BeforeLeaveHandler } from './hooks/useWizardState';
import WizardLayout from './WizardLayout';
import ResumeStep from './steps/ResumeStep';
import ProfileStep from './steps/ProfileStep';
import GitHubStep from './steps/GitHubStep';
import PreferencesStep from './steps/PreferencesStep';
import AutoApplyStep from './steps/AutoApplyStep';
import { useProfileData, useResumeUpload, useGitHubImportDashboard } from '../../hooks';

interface SetupWizardProps {
  onFeedback?: () => void;
  onPrivacy?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
}

export default function SetupWizard({
  onFeedback,
  onPrivacy,
  onSettings,
  onLogout,
}: SetupWizardProps) {
  // --- Wizard navigation state ---
  const wizard = useWizardState();

  // --- Profile data management ---
  const profileState = useProfileData();

  // --- Resume upload ---
  const resumeState = useResumeUpload({
    setProfileData: profileState.setProfileData,
    setDraftId: profileState.setDraftId,
    setIsDataLoaded: profileState.setIsDataLoaded,
  });

  // --- GitHub import ---
  const gitHubState = useGitHubImportDashboard();

  // --- Refs for step save handlers (Continue = Save) ---
  const profileSaveRef = useRef<(() => void) | null>(null);
  const prefsSaveRef = useRef<(() => void) | null>(null);

  // --- Whether extraction/upload/import is in progress (disables all nav) ---
  const isProcessing = resumeState.uploading || resumeState.extracting || gitHubState.importing;

  // --- Sync profile state into wizard state ---
  useEffect(() => {
    if (!profileState.isDataLoaded) return;

    const hasData = !!(
      profileState.profileData.student_name &&
      profileState.profileData.student_name.trim()
    );
    wizard.setProfileHasData(hasData);
    wizard.setProfilePublished(profileState.draftStatus === 'published');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- wizard setters are stable
  }, [
    profileState.isDataLoaded,
    profileState.profileData.student_name,
    profileState.draftStatus,
  ]);

  // ---------------------------------------------------------------------------
  // Before-leave guard: auto-save on step exit for Profile & Preferences
  // ---------------------------------------------------------------------------

  // Set the beforeLeave handler based on the current step.
  // On Profile/Preferences, clicking away triggers save (tour if invalid).
  // Navigation is blocked; commitPendingStep() is called once save succeeds.
  useEffect(() => {
    const handler: BeforeLeaveHandler = (targetStep: number) => {
      // Only guard Profile and Preferences steps
      if (wizard.currentStep === STEP.PROFILE) {
        // Already published — allow free navigation
        if (profileState.draftStatus === 'published') return true;
        // Trigger save (starts tour if invalid, finalizes if valid)
        profileSaveRef.current?.();
        // If the target is the same step, don't block
        if (targetStep === STEP.PROFILE) return true;
        return false; // block — commitPendingStep after save completes
      }

      if (wizard.currentStep === STEP.PREFERENCES) {
        // Always trigger save/validation — the form's handleSave will show tour
        // if invalid, or save + call onSaved (which calls commitPendingStep) if valid.
        // We never skip validation here because the wizard flag may be stale
        // (e.g. user cleared positions after a previous successful save).
        prefsSaveRef.current?.();
        if (targetStep === STEP.PREFERENCES) return true;
        return false;
      }

      return true; // all other steps: free navigation
    };

    wizard.beforeLeaveRef.current = handler;
    return () => { wizard.beforeLeaveRef.current = null; };
  }, [wizard.currentStep, profileState.draftStatus, wizard.beforeLeaveRef]);

  // ---------------------------------------------------------------------------
  // Step completion callbacks — use commitPendingStep for deferred navigation
  // ---------------------------------------------------------------------------

  const handleExtractionComplete = useCallback(() => {
    wizard.markCompleted(STEP.RESUME);
    wizard.setProfileHasData(true);
    wizard.commitPendingStep();
  }, [wizard]);

  const handleProfileSaved = useCallback(() => {
    wizard.markCompleted(STEP.PROFILE);
    wizard.setProfilePublished(true);
    wizard.commitPendingStep();
  }, [wizard]);

  const handlePreferencesSaved = useCallback(() => {
    wizard.markCompleted(STEP.PREFERENCES);
    wizard.setPreferencesComplete(true);
    wizard.commitPendingStep();
  }, [wizard]);

  // ---------------------------------------------------------------------------
  // Derived stepper state
  // ---------------------------------------------------------------------------

  const disabledSteps = useMemo(() => {
    const disabled = new Set<number>();
    if (!wizard.profilePublished || !wizard.preferencesComplete) {
      disabled.add(STEP.AUTO_APPLY);
    }
    return disabled;
  }, [wizard.profilePublished, wizard.preferencesComplete]);

  const warningSteps = useMemo(() => {
    const warnings = new Set<number>();
    if (!wizard.profilePublished && wizard.currentStep !== STEP.PROFILE) {
      warnings.add(STEP.PROFILE);
    }
    if (!wizard.preferencesComplete && wizard.currentStep !== STEP.PREFERENCES) {
      warnings.add(STEP.PREFERENCES);
    }
    return warnings;
  }, [wizard.profilePublished, wizard.preferencesComplete, wizard.currentStep]);

  const stepTooltips = useMemo(() => {
    const tips: Record<number, string> = {};

    if (disabledSteps.has(STEP.AUTO_APPLY)) {
      const missing: string[] = [];
      if (!wizard.profilePublished) missing.push('profile');
      if (!wizard.preferencesComplete) missing.push('preferences');
      tips[STEP.AUTO_APPLY] = `Complete your ${missing.join(' and ')} first`;
    }
    if (warningSteps.has(STEP.PROFILE)) {
      tips[STEP.PROFILE] = 'Profile not published yet';
    }
    if (warningSteps.has(STEP.PREFERENCES)) {
      tips[STEP.PREFERENCES] = 'Preferences not saved yet';
    }

    return tips;
  }, [disabledSteps, warningSteps, wizard.profilePublished, wizard.preferencesComplete]);

  // ---------------------------------------------------------------------------
  // Per-step navigation config for StepHeader / StickyActionBar
  // ---------------------------------------------------------------------------

  const stepNavConfig = getStepNavConfig(wizard, profileSaveRef, prefsSaveRef);

  // --- Loading state ---
  if (wizard.loading || !profileState.isDataLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">Setting up your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <WizardLayout
      currentStep={wizard.currentStep}
      completedSteps={wizard.completedSteps}
      onStepClick={wizard.goToStep}
      stepsDisabled={isProcessing}
      disabledSteps={disabledSteps}
      warningSteps={warningSteps}
      stepTooltips={stepTooltips}
      onFeedback={onFeedback}
      onPrivacy={onPrivacy}
      onSettings={onSettings}
      onLogout={onLogout}
    >
      {/* Step 0: Resume Upload */}
      {wizard.currentStep === STEP.RESUME && (
        <ResumeStep
          resumeInfo={resumeState.resumeInfo}
          uploading={resumeState.uploading}
          extracting={resumeState.extracting}
          uploadError={resumeState.uploadError}
          extractionProgress={resumeState.extractionProgress}
          handleFileChange={resumeState.handleFileChange}
          handleDownload={resumeState.handleDownload}
          onExtractionComplete={handleExtractionComplete}
          onNext={stepNavConfig.onNext}
          nextLabel={stepNavConfig.nextLabel}
          nextDisabled={stepNavConfig.nextDisabled}
          stepsDisabled={isProcessing}
        />
      )}

      {/* Step 1: GitHub (optional) */}
      {wizard.currentStep === STEP.GITHUB && (
        <GitHubStep
          profileData={profileState.profileData}
          setProfileData={profileState.setProfileData}
          importingGitHub={gitHubState.importing}
          githubImportProgress={gitHubState.progress}
          onGitHubImport={gitHubState.importGitHubData}
          onBack={wizard.goBack}
          onNext={stepNavConfig.onNext}
          nextLabel={stepNavConfig.nextLabel}
          nextDisabled={stepNavConfig.nextDisabled}
          stepsDisabled={isProcessing}
        />
      )}

      {/* Step 2: Profile Editor */}
      {wizard.currentStep === STEP.PROFILE && (
        <ProfileStep
          profileData={profileState.profileData}
          setProfileData={profileState.setProfileData}
          validation={profileState.validation}
          draftStatus={profileState.draftStatus}
          finalizing={profileState.finalizing}
          saveSuccess={profileState.saveSuccess}
          handleFinalize={profileState.handleFinalize}
          onSaved={handleProfileSaved}
          saveRef={profileSaveRef}
          onBack={wizard.goBack}
          onNext={stepNavConfig.onNext}
          nextLabel={stepNavConfig.nextLabel}
          nextDisabled={stepNavConfig.nextDisabled}
          stepsDisabled={isProcessing}
        />
      )}

      {/* Step 3: Preferences */}
      {wizard.currentStep === STEP.PREFERENCES && (
        <PreferencesStep
          onSaved={handlePreferencesSaved}
          saveRef={prefsSaveRef}
          onBack={wizard.goBack}
          onNext={stepNavConfig.onNext}
          nextLabel={stepNavConfig.nextLabel}
          nextDisabled={stepNavConfig.nextDisabled}
          stepsDisabled={isProcessing}
        />
      )}

      {/* Step 4: Auto Apply */}
      {wizard.currentStep === STEP.AUTO_APPLY && (
        <AutoApplyStep
          profilePublished={wizard.profilePublished}
          preferencesComplete={wizard.preferencesComplete}
          onBack={wizard.goBack}
          stepsDisabled={isProcessing}
        />
      )}
    </WizardLayout>
  );
}

// =============================================================================
// Helper: compute per-step navigation config
// =============================================================================

interface StepNavConfig {
  onNext: () => void;
  nextLabel: string;
  nextDisabled: boolean;
}

function getStepNavConfig(
  wizard: ReturnType<typeof useWizardState>,
  profileSaveRef: React.MutableRefObject<(() => void) | null>,
  prefsSaveRef: React.MutableRefObject<(() => void) | null>,
): StepNavConfig {
  switch (wizard.currentStep) {
    case STEP.RESUME:
      return {
        onNext: () => {
          wizard.markCompleted(STEP.RESUME);
          wizard.commitPendingStep();
        },
        nextLabel: 'Continue',
        nextDisabled: false,
      };

    case STEP.GITHUB:
      return {
        onNext: () => {
          wizard.markCompleted(STEP.GITHUB);
          wizard.commitPendingStep();
        },
        nextLabel: 'Continue',
        nextDisabled: false,
      };

    case STEP.PROFILE:
      return {
        onNext: () => {
          if (wizard.profilePublished) {
            wizard.markCompleted(STEP.PROFILE);
            wizard.commitPendingStep();
          } else {
            profileSaveRef.current?.();
          }
        },
        nextLabel: wizard.profilePublished ? 'Continue' : 'Save & Continue',
        nextDisabled: false,
      };

    case STEP.PREFERENCES:
      return {
        onNext: () => {
          // Always trigger save/validation — never skip based on the wizard flag.
          // handleSave validates form state, shows tour if invalid, saves if valid.
          prefsSaveRef.current?.();
        },
        nextLabel: 'Save & Continue',
        nextDisabled: false,
      };

    case STEP.AUTO_APPLY:
      return {
        onNext: () => {},
        nextLabel: '',
        nextDisabled: true,
      };

    default:
      return {
        onNext: wizard.commitPendingStep,
        nextLabel: 'Next',
        nextDisabled: false,
      };
  }
}
