/**
 * useSavePreferences Hook
 * 
 * Handles saving work preferences with validation, API calls, and YAML export.
 */

import { useState, useCallback } from 'react';
import { apiFetch } from '@/lib/client/http';
import { getElectronAPI } from '@/lib/client/runtime';
import { exportPreferencesToYAML } from '@/lib/client/yamlConverter';
import type { WorkPreferences, ValidationErrors } from '../types';
import { getValidationErrors } from '../validation';

interface UseSavePreferencesOptions {
  getPreferencesToValidate: () => WorkPreferences;
  flushPendingInputs: () => void;
  setInitialPreferences: (prefs: WorkPreferences) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  clearDraft: () => void;
  onUnsavedChanges?: (hasChanges: boolean) => void;
  onSave?: () => void;
  onTourStart: (errors: ValidationErrors) => void;
  onTourExit: () => void;
}

export function useSavePreferences({
  getPreferencesToValidate,
  flushPendingInputs,
  setInitialPreferences,
  setHasUnsavedChanges,
  clearDraft,
  onUnsavedChanges,
  onSave,
  onTourStart,
  onTourExit,
}: UseSavePreferencesOptions) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors | null>(null);

  const handleSave = async () => {
    const prefsToValidate = getPreferencesToValidate();
    const currentValidationErrors = getValidationErrors(prefsToValidate);

    if (Object.keys(currentValidationErrors).length > 0) {
      setValidationErrors(currentValidationErrors);
      onTourStart(currentValidationErrors);
      return;
    }

    // Flush pending inputs to UI state
    flushPendingInputs();

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await apiFetch('/api/student/work-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefsToValidate),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      // Update state after successful save
      setInitialPreferences(prefsToValidate);
      setHasUnsavedChanges(false);
      onUnsavedChanges?.(false);
      clearDraft();
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setValidationErrors(null);
      onTourExit();
      
      // Export to YAML (Electron only)
      if (getElectronAPI()) {
        try {
          await exportPreferencesToYAML(prefsToValidate);
        } catch (yamlError) {
          console.error('Failed to export YAML:', yamlError);
        }
      }
      
      onSave?.();
    } catch (error) {
      console.error('Save error:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const updateValidationErrors = useCallback((prefs: WorkPreferences) => {
    setValidationErrors(getValidationErrors(prefs));
  }, []);

  return {
    saving,
    saveError,
    saveSuccess,
    validationErrors,
    handleSave,
    updateValidationErrors,
  };
}
