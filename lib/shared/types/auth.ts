export interface UserProfile {
  id: string;
  email: string;
  role: 'student' | 'company';
  created_at?: string;
  has_seen_welcome_notice?: boolean;
}

export interface SignupPayload {
  email: string;
  password: string;
  role: 'student' | 'company';
  captchaToken?: string;
  /** Referral code - stored in user metadata for cross-browser email confirmation */
  referralCode?: string | null;
}

export interface SignupResponse {
  success: boolean;
  userId?: string;
  error?: string;
  message?: string;
  loggedIn?: boolean;
  profile?: UserProfile;
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    user?: { id: string };
  };
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
