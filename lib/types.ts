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
