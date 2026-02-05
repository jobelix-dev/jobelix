/**
 * Validation logic for Work Preferences
 */

import { WorkPreferences, ValidationErrors } from './types';

export const getValidationErrors = (prefs: WorkPreferences): ValidationErrors => {
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

  const hasJobOfferRecency =
    prefs.date_24_hours ||
    prefs.date_week ||
    prefs.date_month ||
    prefs.date_all_time;
  if (!hasJobOfferRecency) errors.jobOfferRecency = true;

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

export const getValidationErrorMessage = (errors: ValidationErrors): string | null => {
  if (errors.positions) return 'At least 1 target position is required';
  if (errors.locations) return 'At least 1 location is required';
  if (errors.experience) return 'Select at least 1 experience level';
  if (errors.jobType) return 'Select at least 1 job type';
  if (errors.jobOfferRecency) return 'Select at least 1 job offer recency option';
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

export const getValidationError = (prefs: WorkPreferences): string | null => {
  return getValidationErrorMessage(getValidationErrors(prefs));
};

export const isFormComplete = (prefs: WorkPreferences): boolean => {
  return getValidationError(prefs) === null;
};
