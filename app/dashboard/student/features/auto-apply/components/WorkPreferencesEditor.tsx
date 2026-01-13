/**
 * WorkPreferencesEditor Component
 * 
 * Main component for configuring job search preferences.
 * Orchestrates all section components and handles save/load logic.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Save, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { exportPreferencesToYAML } from '@/lib/client/yamlConverter';
import SearchCriteriaSection from './SearchCriteriaSection';
import ExperienceLevelsSection from './ExperienceLevelsSection';
import JobTypesSection from './JobTypesSection';
import DateFiltersSection from './DateFiltersSection';
import PersonalInfoSection from './PersonalInfoSection';
import WorkAuthorizationSection from './WorkAuthorizationSection';
import WorkPreferencesSection from './WorkPreferencesSection';

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
  exp_entry: false,
  exp_associate: false,
  exp_mid_senior: false,
  exp_director: false,
  exp_executive: false,
  job_full_time: false,
  job_part_time: false,
  job_contract: false,
  job_temporary: false,
  job_internship: false,
  job_volunteer: false,
  job_other: false,
  date_24_hours: false,
  date_week: false,
  date_month: false,
  date_all_time: false,
  positions: [],
  locations: [],
  company_blacklist: [],
  title_blacklist: [],
  date_of_birth: '',
  pronouns: '',
  gender: '',
  is_veteran: false,
  has_disability: false,
  ethnicity: '',
  eu_work_authorization: false,
  us_work_authorization: false,
  in_person_work: true,
  open_to_relocation: false,
  willing_to_complete_assessments: true,
  willing_to_undergo_drug_tests: true,
  willing_to_undergo_background_checks: true,
  notice_period: '',
  salary_expectation_usd: 0,
};

export default function WorkPreferencesEditor({ onSave }: { onSave?: () => void }) {
  const [preferences, setPreferences] = useState<WorkPreferences>(defaultPreferences);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  // Fetch existing preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/student/work-preferences');
        const data = await response.json();
        
        if (data.preferences) {
          setPreferences({ ...defaultPreferences, ...data.preferences });
        }
      } catch (error) {
        console.error('Failed to fetch preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, []);

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
    if (preferences.positions.length === 0) return 'At least 1 position is required';
    
    // At least one location is required
    if (preferences.locations.length === 0) return 'At least 1 location is required';
    
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
    
    // At least one date filter must be selected
    const hasDateFilter =
      preferences.date_24_hours ||
      preferences.date_week ||
      preferences.date_month ||
      preferences.date_all_time;
    if (!hasDateFilter) return 'Select at least 1 date filter';
    
    // Required personal fields
    if (!preferences.date_of_birth) return 'Date of birth is required';
    if (!preferences.notice_period) return 'Notice period is required';
    if (!preferences.salary_expectation_usd || preferences.salary_expectation_usd <= 0) return 'Salary expectation is required';
    
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

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      // Export preferences to YAML file in repo root
      try {
        console.log('Exporting YAML config...');
        await exportPreferencesToYAML(preferences);
        console.log('YAML config exported successfully');
      } catch (yamlError) {
        console.error('Failed to export YAML:', yamlError);
        // Don't fail the whole save if YAML export fails
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
        <div className="text-zinc-500 dark:text-zinc-400">Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Validation warning */}
      {validationWarning && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span className="text-sm text-amber-700 dark:text-amber-300">{validationWarning}</span>
        </div>
      )}

      {/* Save error feedback */}
      {saveError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-300">{saveError}</span>
        </div>
      )}

      {/* Unified Two-Column Container */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
        {/* Header inside container */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
              <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Job Search Preferences
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                All fields are <span className="font-semibold">required</span> for the auto-apply bot to work properly
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
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
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Personal Information Section */}
            <div className="p-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
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

            {/* Experience Levels Section */}
            <div className="p-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
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

            {/* Job Types Section */}
            <div className="p-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
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

            {/* Date Filters Section */}
            <div className="p-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
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

            {/* Work Authorization Section */}
            <div className="p-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
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
          <div className="space-y-6">
            {/* Search Criteria Section */}
            <div className="p-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <SearchCriteriaSection
                positions={preferences.positions}
                locations={preferences.locations}
                companyBlacklist={preferences.company_blacklist}
                titleBlacklist={preferences.title_blacklist}
                remoteWork={preferences.remote_work}
                onChange={updateSearchCriteria}
              />
            </div>

            {/* Additional Work Preferences Section */}
            <div className="p-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <WorkPreferencesSection
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
          </div>
        </div>
      </div>
    </div>
  );
}
