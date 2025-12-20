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
  profile?: UserProfile;
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
