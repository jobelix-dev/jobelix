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

export interface ProjectEntry {
  project_name: string;
  description: string | null;
  link: string | null;
}

export interface SkillEntry {
  skill_name: string;
  skill_slug: string;
}

export interface LanguageEntry {
  language_name: string;
  proficiency_level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Fluent' | 'Native';
}

export interface PublicationEntry {
  title: string;
  journal_name: string | null;
  description: string | null;
  publication_year: number | null;
  publication_month: number | null;
  link: string | null;
}

export interface CertificationEntry {
  name: string;
  issuing_organization: string | null;
  url: string | null;
}

/**
 * Only supports: GitHub, LinkedIn, StackOverflow, Kaggle, LeetCode
 */
export interface SocialLinkEntry {
  github?: string | null;
  linkedin?: string | null;
  stackoverflow?: string | null;
  kaggle?: string | null;
  leetcode?: string | null;
}

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

export interface ContactInfo {
  phone_number?: string | null;
  email?: string | null;
}

export interface ExtractedResumeData {
  student_name: string | null;
  phone_number: string | null;
  phone_country_code: string | null; // ISO 3166-1 alpha-2 (e.g., "US", "GB")
  email: string | null;
  address: string | null;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  skills: SkillEntry[];
  languages: LanguageEntry[];
  publications: PublicationEntry[];
  certifications: CertificationEntry[];
  social_links: SocialLinkEntry;
}

/** Extends ExtractedResumeData with database fields */
export interface DraftProfileData extends ExtractedResumeData {
  id: string;
  status: 'editing' | 'published';
  student_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExtractDataResponse {
  success: boolean;
  draftId: string;
  extracted: ExtractedResumeData;
  needsReview: boolean;
  error?: string;
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}
