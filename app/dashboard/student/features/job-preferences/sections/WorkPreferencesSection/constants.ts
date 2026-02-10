/**
 * Constants for Work Preferences
 */

import { WorkPreferences } from './types';

/**
 * Supported languages for job description filtering.
 * Uses ISO 639-1 two-letter codes compatible with franc-min.
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'fi', name: 'Finnish' },
] as const;

export type SupportedLanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export const defaultPreferences: WorkPreferences = {
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
  job_languages: ['en'],
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

export const DRAFT_STORAGE_KEY = 'job-preferences-draft-v1';
