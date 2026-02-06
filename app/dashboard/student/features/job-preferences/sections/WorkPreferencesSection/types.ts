/**
 * Type definitions for Work Preferences
 */

export interface WorkPreferences {
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

  // Job offer recency
  date_24_hours: boolean;
  date_week: boolean;
  date_month: boolean;
  date_all_time: boolean;

  // Search arrays
  positions: string[];
  locations: string[];
  company_blacklist: string[];
  title_blacklist: string[];

  // Job description languages (ISO 639-1 codes)
  job_languages: string[];

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

export type ValidationErrors = {
  positions?: boolean;
  locations?: boolean;
  experience?: boolean;
  jobType?: boolean;
  jobOfferRecency?: boolean;
  workAuthorization?: boolean;
  date_of_birth?: boolean;
  pronouns?: boolean;
  gender?: boolean;
  ethnicity?: boolean;
  notice_period?: boolean;
  salary_expectation_usd?: boolean;
};
