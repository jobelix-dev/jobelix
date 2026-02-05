/**
 * LinkedIn Auto Apply Bot - TypeScript Type Definitions
 * 
 * Core types and interfaces for the bot.
 * Mirrors the Python data models for compatibility.
 */

// ============================================================================
// Resume Types
// ============================================================================

export interface PersonalInformation {
  name: string;
  surname: string;
  dateOfBirth?: string;
  country: string;
  city: string;
  /** Full phone number as entered by user (may or may not include prefix) */
  phone: string;
  /** Country code prefix extracted from phone or inferred from country (e.g., "+1") */
  phonePrefix: string;
  /** National phone number without country code prefix */
  phoneNational: string;
  email: string;
  github?: string;
  linkedin?: string;
}

export interface SelfIdentification {
  gender: string;
  pronouns: string;
  veteran: string;
  disability: string;
  ethnicity: string;
}

export interface LegalAuthorization {
  euWorkAuthorization: string;
  usWorkAuthorization: string;
  requiresUsVisa: string;
  legallyAllowedToWorkInUs: string;
  requiresUsSponsorship: string;
  requiresEuVisa: string;
  legallyAllowedToWorkInEu: string;
  requiresEuSponsorship: string;
}

export interface WorkPreferences {
  remoteWork: string;
  inPersonWork: string;
  openToRelocation: string;
  willingToCompleteAssessments: string;
  willingToUndergoDrugTests: string;
  willingToUndergoBackgroundChecks: string;
}

export interface Education {
  degree: string;
  university: string;
  graduationYear: string;
  fieldOfStudy: string;
  gpa?: string;
}

export interface Experience {
  position: string;
  company: string;
  employmentPeriod: string;
  location: string;
  industry?: string;
  keyResponsibilities: Record<string, string>;
  skillsAcquired?: Record<string, string>;
}

export interface Project {
  name: string;
  description: string;
  link?: string;
}

export interface Availability {
  noticePeriod: string;
}

export interface SalaryExpectations {
  salaryRangeUSD: string;
}

export interface Language {
  language: string;
  proficiency: string;
}

export interface Resume {
  personalInformation: PersonalInformation;
  selfIdentification: SelfIdentification;
  legalAuthorization: LegalAuthorization;
  workPreferences: WorkPreferences;
  educationDetails: Education[];
  experienceDetails: Experience[];
  projects?: Project[];
  availability: Availability;
  salaryExpectations: SalaryExpectations;
  languages: Language[];
  interests?: string;
  achievements?: string[];
  certifications?: string[];
  skills?: string[];
}

// ============================================================================
// Job Types
// ============================================================================

export interface Job {
  title: string;
  company: string;
  location: string;
  link: string;
  applyMethod: string;
  description?: string;
  summarizedDescription?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ExperienceLevel {
  internship: boolean;
  entry: boolean;
  associate: boolean;
  'mid-senior level': boolean;
  director: boolean;
  executive: boolean;
}

export interface JobTypes {
  'full-time': boolean;
  contract: boolean;
  'part-time': boolean;
  temporary: boolean;
  internship: boolean;
  other: boolean;
  volunteer: boolean;
}

export interface DateFilter {
  'all time': boolean;
  month: boolean;
  week: boolean;
  '24 hours': boolean;
}

export interface JobSearchConfig {
  remote: boolean;
  experienceLevel: ExperienceLevel;
  jobTypes: JobTypes;
  date: DateFilter;
  positions: string[];
  locations: string[];
  distance: number;
  companyBlacklist: string[];
  titleBlacklist: string[];
}

// ============================================================================
// Bot Status Types
// ============================================================================

export interface BotStats {
  jobsFound: number;
  jobsApplied: number;
  jobsFailed: number;
  creditsUsed: number;
}

export type BotActivity =
  | 'initializing'
  | 'linkedin_login'
  | 'linkedin_login_done'
  | 'searching_jobs'
  | 'jobs_found'
  | 'applying_jobs'
  | 'submitting_application'
  | 'application_submitted'
  | 'application_failed'
  | 'finalizing'
  | 'stopped'
  | 'stats_update';

export interface BotStatusMessage {
  type: 'session_start' | 'heartbeat' | 'session_complete' | 'stopped' | 'error';
  activity?: BotActivity;
  details?: Record<string, unknown>;
  stats: BotStats;
  success?: boolean;
  errorMessage?: string;
}

// ============================================================================
// Form Handler Types
// ============================================================================

export interface SavedAnswer {
  questionType: string;
  questionText: string;
  answer: string;
}

export type FieldType = 
  | 'radio'
  | 'dropdown'
  | 'text'
  | 'textarea'
  | 'typeahead'
  | 'date'
  | 'file';

// ============================================================================
// API Types
// ============================================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
}

export interface ChatCompletionResponse {
  content: string;
  model: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
