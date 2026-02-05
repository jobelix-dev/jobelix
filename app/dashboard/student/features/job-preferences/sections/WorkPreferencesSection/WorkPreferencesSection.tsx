/**
 * WorkPreferencesSection Component
 * 
 * Main section for configuring job search preferences.
 * Orchestrates all sub-section components and handles save/load logic.
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Save, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import ValidationTour from '@/app/dashboard/student/components/ValidationTour';
import SearchCriteriaSection, { SearchCriteriaSectionRef } from './components/SearchCriteriaSection';
import ExperienceLevelsSection from './components/ExperienceLevelsSection';
import JobTypesSection from './components/JobTypesSection';
import JobOfferRecencySection from './components/JobOfferRecencySection';
import PersonalInfoSection from './components/PersonalInfoSection';
import WorkAuthorizationSection from './components/WorkAuthorizationSection';
import WorkPreferencesSubSection from './components/WorkPreferencesSection';
import BlacklistSection, { BlacklistSectionRef } from './components/BlacklistSection';
import { PreferenceCard } from './components/PreferenceCard';
import { useWorkPreferences, useWorkPreferencesTour, useSavePreferences } from './hooks';
import { getValidationErrors } from './validation';
import type { ValidationErrors } from './types';

interface WorkPreferencesEditorProps {
  onSave?: () => void;
  onUnsavedChanges?: (hasChanges: boolean) => void;
}

export default function WorkPreferencesEditor({ onSave, onUnsavedChanges }: WorkPreferencesEditorProps) {
  const {
    preferences,
    setPreferences: _setPreferences,
    initialPreferences: _initialPreferences,
    setInitialPreferences,
    loading,
    setHasUnsavedChanges,
    updateField,
    updateCheckbox,
    updateArray,
    updateSearchCriteria,
    clearDraft,
  } = useWorkPreferences(onUnsavedChanges);

  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Refs to child components with array inputs
  const searchCriteriaRef = useRef<SearchCriteriaSectionRef>(null);
  const blacklistRef = useRef<BlacklistSectionRef>(null);

  const getValidationPreferences = useCallback(() => {
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
  }, [preferences]);

  const {
    tourOpen,
    tourSteps,
    tourIndex,
    handleTourNext,
    handleTourBack,
    handleTourExit,
    startTour,
  } = useWorkPreferencesTour(getValidationPreferences, getValidationErrors, setShowAdvanced);

  const flushPendingInputs = useCallback(() => {
    searchCriteriaRef.current?.flushAllPendingInputs();
    blacklistRef.current?.flushAllPendingInputs();
  }, []);

  const {
    saving,
    saveError,
    saveSuccess,
    validationErrors,
    handleSave,
    updateValidationErrors,
  } = useSavePreferences({
    getPreferencesToValidate: getValidationPreferences,
    flushPendingInputs,
    setInitialPreferences,
    setHasUnsavedChanges,
    clearDraft,
    onUnsavedChanges,
    onSave,
    onTourStart: startTour,
    onTourExit: handleTourExit,
  });

  useEffect(() => {
    if (tourOpen) {
      updateValidationErrors(preferences);
    }
  }, [preferences, tourOpen, updateValidationErrors]);

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
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 px-1 sm:px-0">
      {saveError && (
        <div className="flex items-center gap-2 p-3 bg-primary-subtle/60/30 border border-border rounded-lg text-sm shadow-sm">
          <AlertCircle className="w-4 h-4 text-primary-hover flex-shrink-0" />
          <span className="text-primary-hover">{saveError}</span>
        </div>
      )}

      <div className="space-y-6 sm:space-y-8">
        {/* Essential Fields */}
        <div className="space-y-3 sm:space-y-4">
          <PreferenceCard>
            <SearchCriteriaSection
              ref={searchCriteriaRef}
              positions={preferences.positions}
              locations={preferences.locations}
              remoteWork={preferences.remote_work}
              onChange={updateSearchCriteria}
              errors={{ positions: fieldErrors?.positions, locations: fieldErrors?.locations }}
              positionsInputId="job-pref-positions"
              locationsInputId="job-pref-locations"
              positionsAddButtonId="job-pref-positions-add"
              locationsAddButtonId="job-pref-locations-add"
            />
          </PreferenceCard>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <PreferenceCard>
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
            </PreferenceCard>

            <PreferenceCard>
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
            </PreferenceCard>
          </div>
        </div>

        {/* Advanced Settings Toggle */}
        <div className="pt-2 sm:pt-4 mt-4 sm:mt-6">
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

          {showAdvanced && (
            <AdvancedSettings
              preferences={preferences}
              blacklistRef={blacklistRef}
              fieldErrors={fieldErrors}
              updateArray={updateArray}
              updateCheckbox={updateCheckbox}
              updateField={updateField}
            />
          )}
        </div>
      </div>

      <SaveButton saving={saving} saveSuccess={saveSuccess} onSave={handleSave} />

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

// --- Sub-components ---

import type { WorkPreferences } from './types';

interface AdvancedSettingsProps {
  preferences: WorkPreferences;
  blacklistRef: React.RefObject<BlacklistSectionRef | null>;
  fieldErrors: ValidationErrors | null;
  updateArray: (field: string, value: string[]) => void;
  updateCheckbox: (field: string, checked: boolean) => void;
  updateField: (field: string, value: string | number | boolean | string[] | null) => void;
}

function AdvancedSettings({ preferences, blacklistRef, fieldErrors, updateArray, updateCheckbox, updateField }: AdvancedSettingsProps) {
  return (
    <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
      <p className="text-sm text-primary-hover italic">
        These fields are optional and have sensible defaults
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Left Column */}
        <div className="space-y-3 sm:space-y-4">
          <PreferenceCard>
            <BlacklistSection
              ref={blacklistRef}
              companyBlacklist={preferences.company_blacklist}
              titleBlacklist={preferences.title_blacklist}
              onChange={updateArray}
            />
          </PreferenceCard>

          <PreferenceCard>
            <JobOfferRecencySection
              values={{
                date_24_hours: preferences.date_24_hours,
                date_week: preferences.date_week,
                date_month: preferences.date_month,
                date_all_time: preferences.date_all_time,
              }}
              onChange={updateCheckbox}
              hasError={fieldErrors?.jobOfferRecency}
              tourId="job-pref-job-offer-recency"
            />
          </PreferenceCard>

          <PreferenceCard>
            <WorkAuthorizationSection
              values={{
                eu_work_authorization: preferences.eu_work_authorization,
                us_work_authorization: preferences.us_work_authorization,
              }}
              onChange={updateCheckbox}
              hasError={fieldErrors?.workAuthorization}
              tourId="job-pref-work-authorization"
            />
          </PreferenceCard>
        </div>

        {/* Right Column */}
        <div className="space-y-3 sm:space-y-4">
          <PreferenceCard>
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
          </PreferenceCard>

          <PreferenceCard>
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
          </PreferenceCard>
        </div>
      </div>
    </div>
  );
}

interface SaveButtonProps {
  saving: boolean;
  saveSuccess: boolean;
  onSave: () => void;
}

function SaveButton({ saving, saveSuccess, onSave }: SaveButtonProps) {
  return (
    <button
      id="save-preferences-button"
      onClick={onSave}
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
  );
}
