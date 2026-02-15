/**
 * ProfileStep Component
 * 
 * Step 2 of the wizard — Profile Editor.
 * Wraps ProfileEditorSection with:
 * - StepHeader with title and back navigation
 * - StickyActionBar at the bottom for Save & Continue (always visible)
 * - Validation tour (spotlights missing fields on invalid save attempt)
 * - Accordion expansion state for education, experience, publications, certifications
 * - Project editing modal state
 * - Confirm dialog for project deletion
 * 
 * The parent (SetupWizard) calls `onSave` from the Continue button —
 * this component exposes `handleSave` which either starts the tour
 * (if invalid) or finalizes (if valid).
 */

'use client';

import { useState, useCallback, useEffect, useRef, Dispatch, SetStateAction, MutableRefObject } from 'react';
import ProfileEditorSection from '../../profile/sections/ProfileEditorSection/ProfileEditorSection';
import ValidationTour from '@/app/dashboard/student/components/ValidationTour';
import { useConfirmDialog } from '@/app/components/useConfirmDialog';
import { useProfileTour } from '../../profile/hooks';
import StepHeader from '../components/StepHeader';
import StickyActionBar from '../components/StickyActionBar';
import type { StepNavProps } from '../components/StepHeader';
import type { ExtractedResumeData } from '@/lib/shared/types';
import type { ProfileValidationResult } from '@/lib/client/profileValidation';

interface ProfileStepProps extends StepNavProps {
  /** Current profile data */
  profileData: ExtractedResumeData;
  /** Update profile data */
  setProfileData: Dispatch<SetStateAction<ExtractedResumeData>>;
  /** Validation result */
  validation: ProfileValidationResult;
  /** Draft status (editing/published) */
  draftStatus: 'editing' | 'published';
  /** Whether profile is currently being finalized */
  finalizing: boolean;
  /** Whether save was successful (shows checkmark briefly) */
  saveSuccess: boolean;
  /** Finalize/publish the profile */
  handleFinalize: () => Promise<void>;
  /** Called after successful save — parent advances to next step */
  onSaved?: () => void;
  /** Ref that parent sets to trigger save from Continue button */
  saveRef?: MutableRefObject<(() => void) | null>;
}

export default function ProfileStep({
  profileData,
  setProfileData,
  validation,
  draftStatus,
  finalizing,
  saveSuccess,
  handleFinalize,
  onSaved,
  saveRef,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  stepsDisabled,
}: ProfileStepProps) {
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  // --- Accordion/editing state for ProfileEditorSection ---
  const [editingProjectIndex, setEditingProjectIndex] = useState<number | null>(null);
  const [expandedEducationIndex, setExpandedEducationIndex] = useState<number | null>(null);
  const [expandedExperienceIndex, setExpandedExperienceIndex] = useState<number | null>(null);
  const [expandedPublicationIndex, setExpandedPublicationIndex] = useState<number | null>(null);
  const [expandedCertificationIndex, setExpandedCertificationIndex] = useState<number | null>(null);

  // Guard ref: only advance wizard when an explicit save was initiated via handleSave.
  // Prevents the onSaved effect from firing due to stale saveSuccess/draftStatus state
  // when the user re-edits a previously published profile within the 3-second window.
  const hasPendingSaveRef = useRef(false);

  // --- Validation tour ---
  const {
    profileTourOpen,
    profileTourSteps,
    profileTourIndex,
    startProfileTour,
    handleProfileTourNext,
    handleProfileTourBack,
    handleProfileTourExit,
  } = useProfileTour(
    validation,
    setExpandedEducationIndex,
    setExpandedExperienceIndex,
    setExpandedPublicationIndex,
    setExpandedCertificationIndex,
    setEditingProjectIndex,
  );

  // --- Tour-aware save handler ---
  // Used by both the StickyActionBar and the wizard Continue / beforeLeave
  const handleSave = useCallback(() => {
    if (!validation.isValid) {
      startProfileTour();
      return;
    }
    if (profileTourOpen) {
      handleProfileTourExit();
    }
    hasPendingSaveRef.current = true;
    handleFinalize();
  }, [validation.isValid, profileTourOpen, startProfileTour, handleProfileTourExit, handleFinalize]);

  // --- Expose handleSave to parent via ref ---
  useEffect(() => {
    if (saveRef) {
      saveRef.current = handleSave;
    }
    return () => {
      if (saveRef) {
        saveRef.current = null;
      }
    };
  }, [saveRef, handleSave]);

  // --- Notify parent when save succeeds ---
  // When saveSuccess flips to true and profile is published, call onSaved.
  // The hasPendingSaveRef guard ensures this only fires after an explicit handleSave,
  // not from stale state when re-editing a previously published profile.
  useEffect(() => {
    if (saveSuccess && draftStatus === 'published' && onSaved && hasPendingSaveRef.current) {
      hasPendingSaveRef.current = false;
      onSaved();
    }
  }, [saveSuccess, draftStatus, onSaved]);

  // Note: We intentionally do NOT auto-exit the tour when validation.isValid
  // becomes true. The tour's own next() logic handles this — when all errors are
  // fixed, clicking Next shows the completion step ("All set — save now").
  // Auto-exiting caused the tour to vanish mid-edit without the user clicking Next.

  const currentTourStep = profileTourSteps[profileTourIndex] ?? null;
  const isCompletionStep = profileTourSteps[0]?.id === 'complete';

  // --- Status text for the sticky bar ---
  const statusText = draftStatus === 'published'
    ? 'Published'
    : 'Draft — auto-saved';

  return (
    <div className="space-y-6">
      {/* Header with title and back nav (Continue is in the sticky bar) */}
      <StepHeader
        title={draftStatus === 'published' ? 'Your profile' : 'Review your profile'}
        subtitle={
          draftStatus === 'published'
            ? 'Your profile is published. You can edit and re-publish anytime.'
            : 'Review and edit your information, then save to publish your profile'
        }
        showBack={false}
        hideNext
      />

      {/* Profile editor form */}
      <ProfileEditorSection
        data={profileData}
        onChange={setProfileData}
        onSave={handleSave}
        isSaving={finalizing}
        canSave={validation.isValid}
        validation={profileTourOpen ? validation : undefined}
        disabled={finalizing}
        loadingMessage={finalizing ? 'Publishing your profile...' : undefined}
        saveSuccess={saveSuccess}
        editingProjectIndex={editingProjectIndex}
        onEditingProjectIndexChange={setEditingProjectIndex}
        expandedEducationIndex={expandedEducationIndex}
        expandedExperienceIndex={expandedExperienceIndex}
        expandedPublicationIndex={expandedPublicationIndex}
        expandedCertificationIndex={expandedCertificationIndex}
        onConfirmDelete={(message) =>
          confirm(message, {
            title: 'Delete Project',
            variant: 'danger',
            confirmText: 'Delete',
            cancelText: 'Cancel',
          })
        }
        hideSaveButton
      />

      {/* Bottom spacer so sticky bar doesn't cover last form fields */}
      <div className="h-20" aria-hidden="true" />

      {/* Sticky bottom action bar */}
      <StickyActionBar
        onBack={onBack}
        onAction={onNext ?? handleSave}
        actionLabel={nextLabel}
        actionDisabled={nextDisabled}
        allDisabled={stepsDisabled}
        statusText={statusText}
        loading={finalizing}
        success={saveSuccess}
        actionButtonId="publish-profile-button"
      />

      {/* Validation tour overlay */}
      <ValidationTour
        isOpen={profileTourOpen}
        step={currentTourStep}
        onNext={isCompletionStep ? handleSave : handleProfileTourNext}
        onBack={handleProfileTourBack}
        onExit={handleProfileTourExit}
        nextLabel={isCompletionStep ? 'Save & Continue' : 'Next'}
        allowScroll={isCompletionStep}
      />

      {/* Confirm dialog portal */}
      {ConfirmDialogComponent}
    </div>
  );
}
