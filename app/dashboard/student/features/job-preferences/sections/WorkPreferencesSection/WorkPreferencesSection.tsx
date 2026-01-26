/**
 * WorkPreferencesSection Component
 * 
 * Main section for configuring job search preferences.
 * Orchestrates all sub-section components and handles save/load logic.
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Save, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { exportPreferencesToYAML } from '@/lib/client/yamlConverter';
import ValidationTour from '@/app/dashboard/student/components/ValidationTour';
import SearchCriteriaSection, { SearchCriteriaSectionRef } from './components/SearchCriteriaSection';
import ExperienceLevelsSection from './components/ExperienceLevelsSection';
import JobTypesSection from './components/JobTypesSection';
import DateFiltersSection from './components/DateFiltersSection';
import PersonalInfoSection from './components/PersonalInfoSection';
import WorkAuthorizationSection from './components/WorkAuthorizationSection';
import WorkPreferencesSubSection from './components/WorkPreferencesSection';
import BlacklistSection, { BlacklistSectionRef } from './components/BlacklistSection';
import { useWorkPreferences, useWorkPreferencesTour } from './hooks';
import { getValidationErrors } from './validation';
import type { WorkPreferences } from './types';

export default function WorkPreferencesEditor({ onSave, onUnsavedChanges }: { onSave?: () => void; onUnsavedChanges?: (hasChanges: boolean) => void }) {
  const {
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
  } = useWorkPreferences(onUnsavedChanges);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<any | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Refs to child components with array inputs
  const searchCriteriaRef = useRef<SearchCriteriaSectionRef>(null);
  const blacklistRef = useRef<BlacklistSectionRef>(null);

  const getValidationPreferences = () => {
    const pendingSearch = searchCriteriaRef.current?.getPendingInputs();
    const pendingBlacklist = blacklistRef.current?.getPendingInputs();

    const prefsToValidate = { ...preferences };
    if (pendingSearch?.positions.trim()) {
      prefsToValidate.positions = [...preferences.positions, pendingSearch.positions.trim()];
    }
    if (pendingSearch?.locations.trim()) {
      prefsToValidate.locations = [...preferences.locations, pendingSearch.locations.trim()];
    }
    if (pendingBlacklist?.company.trim()) {
      prefsToValidate.company_blacklist = [...preferences.company_blacklist, pendingBlacklist.company.trim()];
    }
    if (pendingBlacklist?.title.trim()) {
      prefsToValidate.title_blacklist = [...preferences.title_blacklist, pendingBlacklist.title.trim()];
    }

    return prefsToValidate;
  };

  const {
    tourOpen,
    tourSteps,
    tourIndex,
    setTourOpen,
    setTourSteps,
    setTourIndex,
    handleTourNext,
    handleTourBack,
    handleTourExit,
    startTour,
  } = useWorkPreferencesTour(getValidationPreferences, getValidationErrors, setShowAdvanced);

  useEffect(() => {
    if (!tourOpen) return;
    setValidationErrors(getValidationErrors(preferences));
  }, [preferences, tourOpen]);

  // Save preferences to database
  const handleSave = async () => {
    const prefsToValidate = getValidationPreferences();
    const currentValidationErrors = getValidationErrors(prefsToValidate);

    if (Object.keys(currentValidationErrors).length > 0) {
      setValidationErrors(currentValidationErrors);
      startTour(currentValidationErrors);
      return;
    }

    // Now flush the pending inputs to actually add them to the UI state
    searchCriteriaRef.current?.flushAllPendingInputs();
    blacklistRef.current?.flushAllPendingInputs();

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Save the complete preferences (including pending inputs)
      const response = await fetch('/api/student/work-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefsToValidate),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      // Update initial preferences to the saved state
      setInitialPreferences(prefsToValidate);
      setHasUnsavedChanges(false); // all changes now saved
      if (onUnsavedChanges) {
        console.log('Calling onUnsavedChanges(false) after save');
        onUnsavedChanges(false);
      }
      clearDraft();
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setValidationErrors(null);
      handleTourExit();
      
      // Export preferences to YAML file in repo root (Electron only)
      if (typeof window !== 'undefined' && window.electronAPI) {
        try {
          console.log('Exporting YAML config...');
          await exportPreferencesToYAML(prefsToValidate);
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

  const showValidationErrors = tourOpen;
  const fieldErrors = showValidationErrors ? validationErrors : null;
  const currentTourStep = tourSteps[tourIndex] ?? null;
  const isCompletionStep = tourSteps[0]?.id === 'complete';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
          <div className="bg-background rounded-xl p-4 shadow-sm">
            <SearchCriteriaSection
              ref={searchCriteriaRef}
              positions={preferences.positions}
              locations={preferences.locations}
              remoteWork={preferences.remote_work}
              onChange={updateSearchCriteria}
              errors={{
                positions: fieldErrors?.positions,
                locations: fieldErrors?.locations,
              }}
              positionsInputId="job-pref-positions"
              locationsInputId="job-pref-locations"
              positionsAddButtonId="job-pref-positions-add"
              locationsAddButtonId="job-pref-locations-add"
            />
          </div>

          {/* Experience Levels & Job Types Side by Side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background rounded-xl p-4 shadow-sm">
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
                hasError={fieldErrors?.experience}
                tourId="job-pref-experience"
              />
            </div>

            <div className="bg-background rounded-xl p-4 shadow-sm">
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
                hasError={fieldErrors?.jobType}
                tourId="job-pref-job-types"
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
                  <div className="bg-background rounded-xl p-4 shadow-sm">
                    <BlacklistSection
                      ref={blacklistRef}
                      companyBlacklist={preferences.company_blacklist}
                      titleBlacklist={preferences.title_blacklist}
                      onChange={updateArray}
                    />
                  </div>

                  <div className="bg-background rounded-xl p-4 shadow-sm">
                    <DateFiltersSection
                      values={{
                        date_24_hours: preferences.date_24_hours,
                        date_week: preferences.date_week,
                        date_month: preferences.date_month,
                        date_all_time: preferences.date_all_time,
                      }}
                      onChange={updateCheckbox}
                      hasError={fieldErrors?.dateFilter}
                      tourId="job-pref-date-filters"
                    />
                  </div>

                  <div className="bg-background rounded-xl p-4 shadow-sm">
                    <WorkAuthorizationSection
                      values={{
                        eu_work_authorization: preferences.eu_work_authorization,
                        us_work_authorization: preferences.us_work_authorization,
                      }}
                      onChange={updateCheckbox}
                      hasError={fieldErrors?.workAuthorization}
                      tourId="job-pref-work-authorization"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div className="bg-background rounded-xl p-4 shadow-sm">
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
                      errors={{
                        notice_period: fieldErrors?.notice_period,
                        salary_expectation_usd: fieldErrors?.salary_expectation_usd,
                      }}
                      noticePeriodId="job-pref-notice-period"
                      salaryId="job-pref-salary"
                    />
                  </div>

                  <div className="bg-background rounded-xl p-4 shadow-sm">
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
                      errors={{
                        date_of_birth: fieldErrors?.date_of_birth,
                        pronouns: fieldErrors?.pronouns,
                        gender: fieldErrors?.gender,
                        ethnicity: fieldErrors?.ethnicity,
                      }}
                      dateOfBirthId="job-pref-date-of-birth"
                      pronounsId="job-pref-pronouns"
                      genderId="job-pref-gender"
                      ethnicityId="job-pref-ethnicity"
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

      <ValidationTour
        isOpen={tourOpen}
        step={currentTourStep}
        onNext={isCompletionStep ? handleTourExit : handleTourNext}
        onBack={handleTourBack}
        onExit={handleTourExit}
      />

    </div>
  );
}
