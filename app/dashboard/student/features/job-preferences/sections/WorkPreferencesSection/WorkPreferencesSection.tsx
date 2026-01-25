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
import ValidationTour, { ValidationTourStep } from '@/app/dashboard/student/components/ValidationTour';
import SearchCriteriaSection, { SearchCriteriaSectionRef } from './components/SearchCriteriaSection';
import ExperienceLevelsSection from './components/ExperienceLevelsSection';
import JobTypesSection from './components/JobTypesSection';
import DateFiltersSection from './components/DateFiltersSection';
import PersonalInfoSection from './components/PersonalInfoSection';
import WorkAuthorizationSection from './components/WorkAuthorizationSection';
import WorkPreferencesSubSection from './components/WorkPreferencesSection';
import BlacklistSection, { BlacklistSectionRef } from './components/BlacklistSection';

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
  salary_expectation_usd: 100000,
};

const DRAFT_STORAGE_KEY = 'job-preferences-draft-v1';

type ValidationErrors = {
  positions?: boolean;
  locations?: boolean;
  experience?: boolean;
  jobType?: boolean;
  dateFilter?: boolean;
  workAuthorization?: boolean;
  date_of_birth?: boolean;
  pronouns?: boolean;
  gender?: boolean;
  ethnicity?: boolean;
  notice_period?: boolean;
  salary_expectation_usd?: boolean;
};

export default function WorkPreferencesEditor({ onSave, onUnsavedChanges }: { onSave?: () => void; onUnsavedChanges?: (hasChanges: boolean) => void }) {
  const [preferences, setPreferences] = useState<WorkPreferences>(defaultPreferences);
  const [initialPreferences, setInitialPreferences] = useState<WorkPreferences>(defaultPreferences);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourSteps, setTourSteps] = useState<ValidationTourStep[]>([]);
  const [tourIndex, setTourIndex] = useState(0);

  // Refs to child components with array inputs
  const searchCriteriaRef = useRef<SearchCriteriaSectionRef>(null);
  const blacklistRef = useRef<BlacklistSectionRef>(null);

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
  const getValidationErrors = (prefs: WorkPreferences): ValidationErrors => {
    const errors: ValidationErrors = {};

    if (prefs.positions.length === 0) errors.positions = true;
    if (prefs.locations.length === 0) errors.locations = true;

    const hasExperienceLevel =
      prefs.exp_internship ||
      prefs.exp_entry ||
      prefs.exp_associate ||
      prefs.exp_mid_senior ||
      prefs.exp_director ||
      prefs.exp_executive;
    if (!hasExperienceLevel) errors.experience = true;

    const hasJobType =
      prefs.job_full_time ||
      prefs.job_part_time ||
      prefs.job_contract ||
      prefs.job_temporary ||
      prefs.job_internship ||
      prefs.job_volunteer ||
      prefs.job_other;
    if (!hasJobType) errors.jobType = true;

    const hasDateFilter =
      prefs.date_24_hours ||
      prefs.date_week ||
      prefs.date_month ||
      prefs.date_all_time;
    if (!hasDateFilter) errors.dateFilter = true;

    if (!prefs.eu_work_authorization && !prefs.us_work_authorization) {
      errors.workAuthorization = true;
    }

    if (!prefs.date_of_birth?.trim()) errors.date_of_birth = true;
    if (!prefs.pronouns?.trim()) errors.pronouns = true;
    if (!prefs.gender?.trim()) errors.gender = true;
    if (!prefs.ethnicity?.trim()) errors.ethnicity = true;

    if (!prefs.notice_period?.trim()) errors.notice_period = true;
    if (!prefs.salary_expectation_usd || prefs.salary_expectation_usd <= 0) {
      errors.salary_expectation_usd = true;
    }

    return errors;
  };

  const getValidationErrorMessage = (errors: ValidationErrors): string | null => {
    if (errors.positions) return 'At least 1 target position is required';
    if (errors.locations) return 'At least 1 location is required';
    if (errors.experience) return 'Select at least 1 experience level';
    if (errors.jobType) return 'Select at least 1 job type';
    if (errors.dateFilter) return 'Select at least 1 date filter';
    if (errors.workAuthorization) return 'Select at least 1 work authorization';
    if (errors.date_of_birth) return 'Date of birth is required';
    if (errors.pronouns) return 'Pronouns are required';
    if (errors.gender) return 'Gender is required';
    if (errors.ethnicity) return 'Ethnicity is required';
    if (errors.notice_period) return 'Notice period is required';
    if (errors.salary_expectation_usd) {
      return 'Salary expectation must be greater than 0';
    }
    return null;
  };

  const getValidationError = (prefs: WorkPreferences): string | null => {
    return getValidationErrorMessage(getValidationErrors(prefs));
  };

  const isFormComplete = () => {
    return getValidationError(preferences) === null;
  };

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

  const buildValidationTourSteps = (errors: ValidationErrors): ValidationTourStep[] => {
    const steps: ValidationTourStep[] = [];

    if (errors.positions) {
      steps.push({
        id: 'positions',
        targetId: 'job-pref-positions',
        targetIds: ['job-pref-positions', 'job-pref-positions-add'],
        title: 'Add a position',
        message: 'Enter at least one target position.',
      });
    }

    if (errors.locations) {
      steps.push({
        id: 'locations',
        targetId: 'job-pref-locations',
        targetIds: ['job-pref-locations', 'job-pref-locations-add'],
        title: 'Choose a location',
        message: 'Enter at least one location.',
      });
    }

    if (errors.experience) {
      steps.push({
        id: 'experience',
        targetId: 'job-pref-experience',
        title: 'Select experience level',
        message: 'Choose at least one experience level.',
      });
    }

    if (errors.jobType) {
      steps.push({
        id: 'jobType',
        targetId: 'job-pref-job-types',
        title: 'Select job type',
        message: 'Choose at least one job type.',
      });
    }

    if (errors.dateFilter) {
      steps.push({
        id: 'dateFilter',
        targetId: 'job-pref-date-filters',
        title: 'Choose a date range',
        message: 'Select at least one date filter.',
        onBefore: () => setShowAdvanced(true),
      });
    }

    if (errors.workAuthorization) {
      steps.push({
        id: 'workAuthorization',
        targetId: 'job-pref-work-authorization',
        title: 'Select work authorization',
        message: 'Choose where you can work.',
        onBefore: () => setShowAdvanced(true),
      });
    }

    if (errors.notice_period) {
      steps.push({
        id: 'notice_period',
        targetId: 'job-pref-notice-period',
        title: 'Enter notice period',
        message: 'Tell us your notice period.',
        onBefore: () => setShowAdvanced(true),
      });
    }

    if (errors.salary_expectation_usd) {
      steps.push({
        id: 'salary_expectation_usd',
        targetId: 'job-pref-salary',
        title: 'Enter salary expectation',
        message: 'Enter a salary greater than 0.',
        onBefore: () => setShowAdvanced(true),
      });
    }

    if (errors.date_of_birth) {
      steps.push({
        id: 'date_of_birth',
        targetId: 'job-pref-date-of-birth',
        title: 'Enter date of birth',
        message: 'Select your date of birth.',
        onBefore: () => setShowAdvanced(true),
      });
    }

    if (errors.pronouns) {
      steps.push({
        id: 'pronouns',
        targetId: 'job-pref-pronouns',
        title: 'Enter pronouns',
        message: 'Type your pronouns.',
        onBefore: () => setShowAdvanced(true),
      });
    }

    if (errors.gender) {
      steps.push({
        id: 'gender',
        targetId: 'job-pref-gender',
        title: 'Enter gender',
        message: 'Type your gender.',
        onBefore: () => setShowAdvanced(true),
      });
    }

    if (errors.ethnicity) {
      steps.push({
        id: 'ethnicity',
        targetId: 'job-pref-ethnicity',
        title: 'Enter ethnicity',
        message: 'Type your ethnicity.',
        onBefore: () => setShowAdvanced(true),
      });
    }

    return steps;
  };

  useEffect(() => {
    if (!tourOpen) return;
    setValidationErrors(getValidationErrors(preferences));
  }, [preferences, tourOpen]);

  // Save preferences to database
  const handleSave = async () => {
    const prefsToValidate = getValidationPreferences();
    const currentValidationErrors = getValidationErrors(prefsToValidate);
    const steps = buildValidationTourSteps(currentValidationErrors);

    if (steps.length > 0) {
      setValidationErrors(currentValidationErrors);
      setTourSteps(steps);
      setTourIndex(0);
      setTourOpen(true);
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
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch (error) {
          console.error('Failed to clear draft preferences:', error);
        }
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setValidationErrors(null);
      setTourOpen(false);
      setTourSteps([]);
      setTourIndex(0);
      
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

  const completionStep: ValidationTourStep = {
    id: 'complete',
    targetId: 'save-preferences-button',
    title: 'Save now',
    message: 'All set - you can save now.',
  };

  const getActiveSteps = () => {
    const prefsToValidate = getValidationPreferences();
    return buildValidationTourSteps(getValidationErrors(prefsToValidate));
  };

  const handleTourNext = () => {
    const activeSteps = getActiveSteps();
    const currentId = tourSteps[tourIndex]?.id;
    const currentIndexInActive = currentId
      ? activeSteps.findIndex((step) => step.id === currentId)
      : -1;
    const nextIndex = currentIndexInActive >= 0 ? currentIndexInActive + 1 : 0;

    if (activeSteps.length === 0) {
      setTourSteps([completionStep]);
      setTourIndex(0);
      return;
    }

    if (nextIndex >= activeSteps.length) {
      setTourSteps([completionStep]);
      setTourIndex(0);
      return;
    }

    setTourSteps(activeSteps);
    setTourIndex(nextIndex);
  };

  const handleTourBack = () => {
    const activeSteps = getActiveSteps();
    const isComplete = tourSteps[0]?.id === 'complete';

    if (isComplete) {
      if (activeSteps.length > 0) {
        setTourSteps(activeSteps);
        setTourIndex(activeSteps.length - 1);
      }
      return;
    }

    const currentId = tourSteps[tourIndex]?.id;
    const currentIndexInActive = currentId
      ? activeSteps.findIndex((step) => step.id === currentId)
      : -1;
    const prevIndex = currentIndexInActive > 0 ? currentIndexInActive - 1 : 0;

    setTourSteps(activeSteps);
    setTourIndex(prevIndex);
  };

  const handleTourExit = () => {
    setTourOpen(false);
    setTourSteps([]);
    setTourIndex(0);
    setValidationErrors(null);
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
