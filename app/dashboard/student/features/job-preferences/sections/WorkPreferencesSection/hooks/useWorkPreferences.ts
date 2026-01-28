/**
 * Hook for managing work preferences state and persistence
 */

import { useState, useEffect } from 'react';
import { WorkPreferences } from '../types';
import { defaultPreferences, DRAFT_STORAGE_KEY } from '../constants';

export function useWorkPreferences(onUnsavedChanges?: (hasChanges: boolean) => void) {
  const [preferences, setPreferences] = useState<WorkPreferences>(defaultPreferences);
  const [initialPreferences, setInitialPreferences] = useState<WorkPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch existing preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        // fetches saved preferences from the backend
        const response = await fetch('/api/student/work-preferences');
        const data = await response.json();
        
        // merges with defaults
        const loadedPrefs = data.preferences
          ? { ...defaultPreferences, ...data.preferences }
          : { ...defaultPreferences };

        let draftPrefs: WorkPreferences | null = null;
        if (typeof window !== 'undefined') {
          try {
            const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (rawDraft) {
              draftPrefs = JSON.parse(rawDraft) as WorkPreferences;
            }
          } catch (error) {
            console.error('Failed to load draft preferences:', error);
          }
        }

        if (draftPrefs) {
          const mergedDraft = { ...loadedPrefs, ...draftPrefs };
          setPreferences(mergedDraft);
          setInitialPreferences(loadedPrefs);
        } else {
          setPreferences(loadedPrefs);
          setInitialPreferences(loadedPrefs);
        }
      } catch (error) {
        console.error('Failed to fetch preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, []); // only runs when component mounts

  // Track unsaved changes
  useEffect(() => {
    // preferences is what we see in the form
    // initial is what was loaded at first and is in db 
    if (loading) return;

    const hasChanges = JSON.stringify(preferences) !== JSON.stringify(initialPreferences);
    setHasUnsavedChanges(hasChanges);
    if (onUnsavedChanges) {
      onUnsavedChanges(hasChanges);
    }

    if (typeof window !== 'undefined') {
      try {
        if (hasChanges) {
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(preferences));
        } else {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      } catch (error) {
        console.error('Failed to persist draft preferences:', error);
      }
    }
  }, [preferences, initialPreferences, onUnsavedChanges, loading]);

  // Generic field updater
  const updateField = (field: string, value: any) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));
  };

  // Checkbox group handler
  const updateCheckbox = (key: string, value: boolean) => {
    updateField(key, value);
  };

  // Array field updater
  const updateArray = (field: string, value: string[]) => {
    updateField(field, value);
  };

  // Mixed field updater for SearchCriteriaSection (arrays and booleans)
  const updateSearchCriteria = (field: string, value: string[] | boolean) => {
    updateField(field, value);
  };

  const clearDraft = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (error) {
        console.error('Failed to clear draft preferences:', error);
      }
    }
  };

  return {
    preferences,
    setPreferences,
    initialPreferences,
    setInitialPreferences,
    loading,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    updateField,
    updateCheckbox,
    updateArray,
    updateSearchCriteria,
    clearDraft,
  };
}
