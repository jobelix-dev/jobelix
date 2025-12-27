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

export interface ExtractDataResponse {
  success: boolean;
  draftId: string;
  extracted: {
    student_name: string | null;
    phone_number: string | null;
    email: string | null;
    address: string | null;
    education: Array<{
      school_name: string;
      degree: string;
      description: string | null;
      starting_date: string | null;
      ending_date: string | null;
      confidence: 'high' | 'medium' | 'low';
    }>;
    experience: Array<{
      organisation_name: string;
      position_name: string;
      description: string | null;
      starting_date: string | null;
      ending_date: string | null;
      confidence: 'high' | 'medium' | 'low';
    }>;
    invalid_fields: Array<{field_path: string, display_name: string, context?: string, error?: string}>;
    missing_fields: Array<{field_path: string, display_name: string, context?: string}>;
    uncertain_fields: Array<{field_path: string, display_name: string, context?: string}>;
  };
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

export interface CompanyOffer {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  created_at?: string;
}
