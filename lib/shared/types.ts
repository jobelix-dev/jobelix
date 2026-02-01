/**
 * TypeScript Type Definitions
 * 
 * Central type definitions for the entire application.
 * Used by: All components and API routes for type safety.
 * Defines User, Student, Resume, Offer, Draft, and Validation types.
 * Ensures consistency between frontend, backend, and database schemas.
 */

export interface UserProfile {
  id: string;
  role: 'student' | 'company';
  created_at?: string;
}

export interface SignupPayload {
  email: string;
  password: string;
  role: 'student' | 'company';
  captchaToken?: string;
}

export interface SignupResponse {
  success: boolean;
  userId?: string;
  error?: string;
  message?: string;
  loggedIn?: boolean;
  profile?: UserProfile;
}

export interface LoginPayload {
  email: string;
  password: string;
  captchaToken?: string;
}

export interface LoginResponse {
  success: boolean;
  error?: string;
}

export interface ProfileResponse {
  profile: UserProfile | null;
  error?: string;
}

export interface ResumeData {
  student_id: string;
  file_name: string;
  created_at: string;
}

export interface ResumeResponse {
  data?: ResumeData;
  error?: string;
}

export interface UploadResponse {
  success: boolean;
  error?: string;
}

// ============================================================================
// Resume Data Structures (Shared across student dashboard components)
// ============================================================================

/**
 * Education entry from resume extraction
 */
export interface EducationEntry {
  school_name: string;
  degree: string;
  description: string | null;
  start_year: number | null;
  start_month: number | null;
  end_year: number | null;
  end_month: number | null;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Experience entry from resume extraction
 */
export interface ExperienceEntry {
  organisation_name: string;
  position_name: string;
  description: string | null;
  start_year: number | null;
  start_month: number | null;
  end_year: number | null;
  end_month: number | null;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Project entry from resume extraction
 */
export interface ProjectEntry {
  project_name: string;
  description: string | null;
  link: string | null;
}

/**
 * Skill entry from resume extraction
 */
export interface SkillEntry {
  skill_name: string;
  skill_slug: string;
}

/**
 * Language entry from resume extraction
 */
export interface LanguageEntry {
  language_name: string;
  proficiency_level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Fluent' | 'Native';
}

/**
 * Publication entry from resume extraction
 */
export interface PublicationEntry {
  title: string;
  journal_name: string | null;
  description: string | null;
  publication_year: number | null;
  publication_month: number | null;
  link: string | null;
}

/**
 * Certification entry from resume extraction
 */
export interface CertificationEntry {
  name: string;
  issuing_organization: string | null;
  url: string | null;
}

/**
 * Social links from resume extraction
 * Only supports specific platforms: GitHub, LinkedIn, StackOverflow, Kaggle, LeetCode
 */
export interface SocialLinkEntry {
  github?: string | null;
  linkedin?: string | null;
  stackoverflow?: string | null;
  kaggle?: string | null;
  leetcode?: string | null;
}

/**
 * Validation issue types for resume data
 */
export interface InvalidField {
  field_path: string;
  display_name: string;
  context?: string;
  error?: string;
}

export interface MissingField {
  field_path: string;
  display_name: string;
  context?: string;
}

export interface UncertainField {
  field_path: string;
  display_name: string;
  context?: string;
}

/**
 * Contact information structure
 */
export interface ContactInfo {
  phone_number?: string | null;
  email?: string | null;
}

/**
 * Complete extracted resume data structure
 * Used by: ProfileEditor and StudentDashboard
 */
export interface ExtractedResumeData {
  student_name: string | null;
  phone_number: string | null;
  email: string | null;
  address: string | null;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  skills: SkillEntry[];
  languages: LanguageEntry[];
  publications: PublicationEntry[];
  certifications: CertificationEntry[];
  social_links: SocialLinkEntry; // Changed from array to object
}

/**
 * Draft profile data structure (database row)
 * Extends ExtractedResumeData with database fields
 */
export interface DraftProfileData extends ExtractedResumeData {
  id: string;
  status: 'editing' | 'published';
  student_id?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * API Response type for resume data extraction
 */
export interface ExtractDataResponse {
  success: boolean;
  draftId: string;
  extracted: ExtractedResumeData;
  needsReview: boolean;
  error?: string;
}

// ============================================================================
// Chat Component Types
// ============================================================================

/**
 * Chat message structure for resume validation chat
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface FinalizeProfileResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface StudentResume {
  user_id: string;
  storage_path: string;
  filename?: string;
  uploaded_at?: string;
}

export interface CompanyOffer {
  id: string;
  company_id: string;
  created_at?: string;
  position_name: string;
  description?: string | null;
  status?: 'draft' | 'published' | 'closed';
  published_at?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  salary_period?: 'hour' | 'day' | 'month' | 'year' | null;
  equity?: boolean | null;
  equity_range?: string | null;
  remote_mode?: 'onsite' | 'hybrid' | 'remote' | null;
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'intern' | null;
  availability?: string | null;
  mission?: string | null;
  stage?: string | null;
  team_size?: number | null;
  seniority?: string | null;
}

// ============================================================================
// Company Offer Draft Types
// ============================================================================

/**
 * Date object used in draft (flexible for UI)
 */
export interface DateObject {
  year: number;
  month: number | null; // 1-12, nullable for "just year"
}

/**
 * Basic Info Section
 */
export interface OfferBasicInfo {
  position_name: string;
  description: string | null;
}

/**
 * Compensation Section
 */
export interface OfferCompensation {
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string; // 3-char code (EUR, USD, GBP)
  salary_period: 'hour' | 'day' | 'month' | 'year' | null;
  equity: boolean;
  equity_range: string | null;
}

/**
 * Work Configuration Section
 */
export interface OfferWorkConfig {
  remote_mode: 'onsite' | 'hybrid' | 'remote' | null;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'intern' | null;
  availability: string | null;
}

/**
 * Skill Entry
 */
export interface OfferSkillEntry {
  skill_slug: string;
  skill_text: string;
  importance: 'must' | 'nice';
  level?: string | null;
  years?: number | null;
}

/**
 * Location Entry
 */
export interface OfferLocationEntry {
  city?: string | null;
  country?: string | null;
}

/**
 * Responsibility Entry
 */
export interface OfferResponsibilityEntry {
  text: string;
}

/**
 * Capability Entry
 */
export interface OfferCapabilityEntry {
  text: string;
  importance: 'must' | 'nice';
}

/**
 * Question Entry
 */
export interface OfferQuestionEntry {
  question: string;
}

/**
 * Perk Entry
 */
export interface OfferPerkEntry {
  text: string;
}

/**
 * Complete Offer Draft Data Structure
 * Used by: OfferEditor and CompanyDashboard
 */
export interface OfferDraftData {
  basic_info: OfferBasicInfo;
  compensation: OfferCompensation;
  work_config: OfferWorkConfig;
  seniority: 'junior' | 'mid' | 'senior' | 'lead' | 'executive' | null;
  skills: OfferSkillEntry[];
  locations: OfferLocationEntry[];
  responsibilities: OfferResponsibilityEntry[];
  capabilities: OfferCapabilityEntry[];
  questions: OfferQuestionEntry[];
  perks: OfferPerkEntry[];
}

/**
 * Company Offer Draft Database Record
 */
export interface CompanyOfferDraft {
  id: string;
  company_id: string;
  offer_id: string | null;
  basic_info: OfferBasicInfo;
  compensation: OfferCompensation;
  work_config: OfferWorkConfig;
  seniority: 'junior' | 'mid' | 'senior' | 'lead' | 'executive' | null;
  skills: OfferSkillEntry[];
  locations: OfferLocationEntry[];
  responsibilities: OfferResponsibilityEntry[];
  capabilities: OfferCapabilityEntry[];
  questions: OfferQuestionEntry[];
  perks: OfferPerkEntry[];
  status: 'editing' | 'ready_to_publish';
  created_at: string;
  updated_at: string;
}

// Bot Session Types
export type BotSessionStatus = 'starting' | 'running' | 'completed' | 'failed' | 'stopped';

export interface BotSession {
  id: string;
  user_id: string;
  status: BotSessionStatus;
  started_at: string;
  last_heartbeat_at: string | null;
  completed_at: string | null;
  current_activity: string | null;
  activity_details: Record<string, unknown> | null;
  jobs_found: number;
  jobs_applied: number;
  jobs_failed: number;
  credits_used: number;
  error_message: string | null;
  error_details: Record<string, unknown> | null;
  bot_version: string | null;
  platform: string | null;
  created_at: string;
  updated_at: string;
}

// Bot Launch Types
export type BotLaunchStage = 'checking' | 'installing' | 'launching' | 'running';

export interface BotLaunchStatus {
  stage: BotLaunchStage;
  message?: string;
  progress?: number;
  logs: string[];
}

export interface HistoricalTotals {
  jobs_found: number;
  jobs_applied: number;
  jobs_failed: number;
  credits_used: number;
}
