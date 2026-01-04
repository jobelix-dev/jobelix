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
}

export interface SignupResponse {
  success: boolean;
  userId?: string;
  error?: string;
  message?: string;
  profile?: UserProfile;
}

export interface LoginPayload {
  email: string;
  password: string;
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

export interface OfferData {
  id: string;
  company_id: string;
  position_name: string;
  description?: string;
  wage?: number;
  starting_date?: string;
  created_at: string;
}

export interface OffersResponse {
  offers: OfferData[];
  error?: string;
}

export interface CreateOfferPayload {
  position_name: string;
  description?: string;
}

export interface CreateOfferResponse {
  success: boolean;
  offer?: OfferData;
  error?: string;
}

export interface DeleteOfferResponse {
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
  user_id: string;
  title: string;
  description?: string;
  created_at?: string;
}
