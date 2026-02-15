/**
 * PreferencesStep Component
 * 
 * Step 3 of the setup wizard.
 * Embeds the existing WorkPreferencesSection for job preference configuration.
 * The component is self-contained (has its own data loading/saving hooks).
 * 
 * The parent (SetupWizard) triggers save via `saveRef` from the Continue button
 * or the StickyActionBar. The inline Save button is hidden.
 */

'use client';

import { useState, useCallback, MutableRefObject } from 'react';
import WorkPreferencesSection from '../../job-preferences/sections/WorkPreferencesSection';
import StepHeader from '../components/StepHeader';
import StickyActionBar from '../components/StickyActionBar';
import type { StepNavProps } from '../components/StepHeader';

interface PreferencesStepProps extends StepNavProps {
  /** Called when preferences are successfully saved */
  onSaved: () => void;
  /** Ref that parent sets to trigger save from Continue button */
  saveRef?: MutableRefObject<(() => void) | null>;
}

export default function PreferencesStep({
  onSaved,
  saveRef,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  stepsDisabled,
}: PreferencesStepProps) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveStateChange = useCallback((state: { saving: boolean; saveSuccess: boolean }) => {
    setSaving(state.saving);
    setSaveSuccess(state.saveSuccess);
  }, []);

  // --- Status text for the sticky bar ---
  const statusText = saving
    ? 'Saving...'
    : saveSuccess
      ? 'Saved'
      : hasUnsavedChanges
        ? 'Unsaved changes'
        : '';

  return (
    <div className="space-y-6">
      {/* Header with title and back nav (Continue is in the sticky bar) */}
      <StepHeader
        title="What are you looking for?"
        subtitle="Tell us about your ideal job so the bot can find the best matches"
        showBack={false}
        hideNext
      />

      {/* Preferences form (self-contained with its own hooks) */}
      <WorkPreferencesSection
        onSave={onSaved}
        onUnsavedChanges={setHasUnsavedChanges}
        hideSaveButton
        saveRef={saveRef}
        onSaveStateChange={handleSaveStateChange}
      />

      {/* Bottom spacer so sticky bar doesn't cover last form fields */}
      <div className="h-20" aria-hidden="true" />

      {/* Sticky bottom action bar */}
      <StickyActionBar
        onBack={onBack}
        onAction={onNext ?? (() => {})}
        actionLabel={nextLabel}
        actionDisabled={nextDisabled}
        allDisabled={stepsDisabled}
        statusText={statusText}
        loading={saving}
        success={saveSuccess}
        actionButtonId="save-preferences-button"
      />
    </div>
  );
}
