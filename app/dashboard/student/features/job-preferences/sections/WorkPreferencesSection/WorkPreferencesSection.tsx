/**
 * WorkPreferencesSection Component
 * 
 * Main section for configuring job search preferences.
 * Orchestrates all sub-section components and handles save/load logic.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Save, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { exportPreferencesToYAML } from '@/lib/client/yamlConverter';
import SearchCriteriaSection from './components/SearchCriteriaSection';
import ExperienceLevelsSection from './components/ExperienceLevelsSection';
import JobTypesSection from './components/JobTypesSection';
import DateFiltersSection from './components/DateFiltersSection';
import PersonalInfoSection from './components/PersonalInfoSection';
import WorkAuthorizationSection from './components/WorkAuthorizationSection';
import WorkPreferencesSubSection from './components/WorkPreferencesSection';
import BlacklistSection from './components/BlacklistSection';

interface WorkPreferences {
  // Work location
  remote_work: boolean;

  // Experience levels
  exp_internship: boolean;
  exp_entry: boolean;
  exp_associate: boolean;
  exp_mid_senior: boolean;
  exp_director: boolean;
  exp_executive: boolean;

  // Job types
  job_full_time: boolean;
  job_part_time: boolean;
  job_contract: boolean;
  job_temporary: boolean;
  job_internship: boolean;
  job_volunteer: boolean;
  job_other: boolean;

  // Date filters
  date_24_hours: boolean;
  date_week: boolean;
  date_month: boolean;
  date_all_time: boolean;

  // Search arrays
  positions: string[];
  locations: string[];
  company_blacklist: string[];
  title_blacklist: string[];

  // Personal/legal (Complete set)
  date_of_birth: string;
  pronouns: string;
  gender: string;
  is_veteran: boolean;
  has_disability: boolean;
  ethnicity: string;
  eu_work_authorization: boolean;
  us_work_authorization: boolean;
  in_person_work: boolean;
  open_to_relocation: boolean;
  willing_to_complete_assessments: boolean;
  willing_to_undergo_drug_tests: boolean;
  willing_to_undergo_background_checks: boolean;
  notice_period: string;
  salary_expectation_usd: number;
}

const defaultPreferences: WorkPreferences = {
  remote_work: true,
  exp_internship: false,
  exp_entry: true,
  exp_associate: true,
  exp_mid_senior: false,
  exp_director: false,
  exp_executive: false,
  job_full_time: true,
  job_part_time: false,
  job_contract: false,
  job_temporary: false,
  job_internship: false,
  job_volunteer: false,
  job_other: false,
  date_24_hours: false,
  date_week: true,
  date_month: false,
  date_all_time: false,
  positions: [],
  locations: ['France'],
  company_blacklist: [],
  title_blacklist: [],
  date_of_birth: '2000-01-01',
  pronouns: 'he/him',
  gender: 'Male',
  is_veteran: false,
  has_disability: false,
  ethnicity: 'European',
  eu_work_authorization: true,
  us_work_authorization: false,
  in_person_work: true,
  open_to_relocation: true,
  willing_to_complete_assessments: true,
  willing_to_undergo_drug_tests: true,
  willing_to_undergo_background_checks: true,
  notice_period: '1 day',
  salary_expectation_usd: 1000,
};

export default function WorkPreferencesEditor({ onSave, onUnsavedChanges }: { onSave?: () => void; onUnsavedChanges?: (hasChanges: boolean) => void }) {
  const [preferences, setPreferences] = useState<WorkPreferences>(defaultPreferences);
  const [initialPreferences, setInitialPreferences] = useState<WorkPreferences>(defaultPreferences);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch existing preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/student/work-preferences');
        const data = await response.json();
        
        if (data.preferences) {
          const loadedPrefs = { ...defaultPreferences, ...data.preferences };
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
  }, []);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = JSON.stringify(preferences) !== JSON.stringify(initialPreferences);
    setHasUnsavedChanges(hasChanges);
    if (onUnsavedChanges) {
      onUnsavedChanges(hasChanges);
    }
  }, [preferences, initialPreferences, onUnsavedChanges]);

  // Generic field updater
  const updateField = (field: string, value: any) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
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

  // Validation: Check if all required fields are filled and return error message
  const getValidationError = (): string | null => {
    // At least one position is required
    if (preferences.positions.length === 0) return 'At least 1 target position is required';
    
    // At least one experience level must be selected
    const hasExperienceLevel = 
      preferences.exp_internship ||
      preferences.exp_entry ||
      preferences.exp_associate ||
      preferences.exp_mid_senior ||
      preferences.exp_director ||
      preferences.exp_executive;
    if (!hasExperienceLevel) return 'Select at least 1 experience level';
    
    // At least one job type must be selected
    const hasJobType =
      preferences.job_full_time ||
      preferences.job_part_time ||
      preferences.job_contract ||
      preferences.job_temporary ||
      preferences.job_internship ||
      preferences.job_volunteer ||
      preferences.job_other;
    if (!hasJobType) return 'Select at least 1 job type';
    
    return null;
  };

  const isFormComplete = () => {
    return getValidationError() === null;
  };

  // Save preferences to database
  const handleSave = async () => {
    // Check validation first
    const validationError = getValidationError();
    if (validationError) {
      setValidationWarning(validationError);
      setTimeout(() => setValidationWarning(null), 1500);
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch('/api/student/work-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      // Update initial preferences to current state after successful save
      setInitialPreferences(preferences);
      setHasUnsavedChanges(false);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      // Export preferences to YAML file in repo root (Electron only)
      if (typeof window !== 'undefined' && window.electronAPI) {
        try {
          console.log('Exporting YAML config...');
          await exportPreferencesToYAML(preferences);
          console.log('YAML config exported successfully');
        } catch (yamlError) {
          console.error('Failed to export YAML:', yamlError);
          // Don't fail the whole save if YAML export fails
        }
      }
      
      // Notify parent component
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted">Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Validation warning */}
      {validationWarning && (
        <div className="flex items-center gap-2 p-3 bg-primary-subtle/20 border border-border rounded-lg text-sm shadow-sm">
          <AlertCircle className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-primary-hover">{validationWarning}</span>
        </div>
      )}

      {/* Save error feedback */}
      {saveError && (
        <div className="flex items-center gap-2 p-3 bg-primary-subtle/60/30 border border-border rounded-lg text-sm shadow-sm">
          <AlertCircle className="w-4 h-4 text-primary-hover flex-shrink-0" />
          <span className="text-primary-hover">{saveError}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="space-y-8">

        {/* Essential Fields */}
        <div className="space-y-4">
          {/* Target Positions & Locations */}
          <div className="bg-background rounded-xl p-4 shadow-sm border border-border">
            <SearchCriteriaSection
              positions={preferences.positions}
              locations={preferences.locations}
              remoteWork={preferences.remote_work}
              onChange={updateSearchCriteria}
            />
          </div>

          {/* Experience Levels & Job Types Side by Side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background rounded-xl p-4 shadow-sm border border-border">
              <ExperienceLevelsSection
                values={{
                  exp_internship: preferences.exp_internship,
                  exp_entry: preferences.exp_entry,
                  exp_associate: preferences.exp_associate,
                  exp_mid_senior: preferences.exp_mid_senior,
                  exp_director: preferences.exp_director,
                  exp_executive: preferences.exp_executive,
                }}
                onChange={updateCheckbox}
              />
            </div>

            <div className="bg-background rounded-xl p-4 shadow-sm border border-border">
              <JobTypesSection
                values={{
                  job_full_time: preferences.job_full_time,
                  job_part_time: preferences.job_part_time,
                  job_contract: preferences.job_contract,
                  job_temporary: preferences.job_temporary,
                  job_internship: preferences.job_internship,
                  job_volunteer: preferences.job_volunteer,
                  job_other: preferences.job_other,
                }}
                onChange={updateCheckbox}
              />
            </div>
          </div>
        </div>

        {/* Advanced Settings Toggle */}
        <div className="pt-4 mt-6">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-semibold text-primary-hover hover:text-primary-hover transition-colors"
          >
            {showAdvanced ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide Optional Settings
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show Optional Settings
              </>
            )}
          </button>

          {/* Advanced Settings Section - Collapsible */}
          {showAdvanced && (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-primary-hover italic">
                These fields are optional and have sensible defaults
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="bg-background rounded-xl p-4 shadow-sm border border-border">
                    <BlacklistSection
                      companyBlacklist={preferences.company_blacklist}
                      titleBlacklist={preferences.title_blacklist}
                      onChange={updateArray}
                    />
                  </div>

                  <div className="bg-background rounded-xl p-4 shadow-sm border border-border">
                    <DateFiltersSection
                      values={{
                        date_24_hours: preferences.date_24_hours,
                        date_week: preferences.date_week,
                        date_month: preferences.date_month,
                        date_all_time: preferences.date_all_time,
                      }}
                      onChange={updateCheckbox}
                    />
                  </div>

                  <div className="bg-background rounded-xl p-4 shadow-sm border border-border">
                    <WorkAuthorizationSection
                      values={{
                        eu_work_authorization: preferences.eu_work_authorization,
                        us_work_authorization: preferences.us_work_authorization,
                      }}
                      onChange={updateCheckbox}
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div className="bg-background rounded-xl p-4 shadow-sm border border-border">
                    <WorkPreferencesSubSection
                      values={{
                        in_person_work: preferences.in_person_work,
                        open_to_relocation: preferences.open_to_relocation,
                        willing_to_complete_assessments: preferences.willing_to_complete_assessments,
                        willing_to_undergo_drug_tests: preferences.willing_to_undergo_drug_tests,
                        willing_to_undergo_background_checks: preferences.willing_to_undergo_background_checks,
                        notice_period: preferences.notice_period,
                        salary_expectation_usd: preferences.salary_expectation_usd,
                      }}
                      onChange={updateField}
                    />
                  </div>

                  <div className="bg-background rounded-xl p-4 shadow-sm border border-border">
                    <PersonalInfoSection
                      values={{
                        date_of_birth: preferences.date_of_birth,
                        pronouns: preferences.pronouns,
                        gender: preferences.gender,
                        ethnicity: preferences.ethnicity,
                        is_veteran: preferences.is_veteran,
                        has_disability: preferences.has_disability,
                      }}
                      onChange={updateField}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <button
        id="save-preferences-button"
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded bg-primary hover:bg-primary-hover text-white shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saveSuccess ? (
          <>
            <CheckCircle className="w-4 h-4" />
            Saved!
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Preferences'}
          </>
        )}
      </button>
    </div>
  );
}
