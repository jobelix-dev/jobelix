/**
 * Client-Side API Helper Functions
 * 
 * Frontend utilities for making API calls to backend routes.
 * Used by: All client components (LoginForm, SignupForm, StudentDashboard, etc.)
 * Provides typed wrappers around fetch() for auth and resume operations.
 * Handles request/response formatting and error handling.
 */

import {
  LoginPayload,
  LoginResponse,
  SignupPayload,
  SignupResponse,
  ProfileResponse,
  ResumeResponse,
  UploadResponse,
  ExtractDataResponse,
  ExtractedResumeData,
  DraftProfileData,
  FinalizeProfileResponse,
} from '../shared/types'

class ApiClient {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    const data = await response.json()

    if (!response.ok) {
      // Handle different error response formats:
      // 1. { error: "message" } - simple error
      // 2. { message: "Validation failed", errors: [...] } - validation errors
      // 3. { error: "message", code: "ERROR_CODE" } - error with code
      
      let errorMessage = 'Request failed';
      
      if (data.error) {
        // Simple error message
        errorMessage = data.error;
      } else if (data.errors && Array.isArray(data.errors)) {
        // Validation errors - extract the first one for display
        // Format: "Field: message" or just "message" if path is empty
        const firstError = data.errors[0];
        if (firstError) {
          errorMessage = firstError.path 
            ? `${this.formatFieldName(firstError.path)}: ${firstError.message}`
            : firstError.message;
        } else if (data.message) {
          errorMessage = data.message;
        }
      } else if (data.message) {
        // Fallback to message field
        errorMessage = data.message;
      }
      
      throw new Error(errorMessage);
    }

    return data
  }

  /**
   * Format field names for display (e.g., "password" -> "Password")
   */
  private formatFieldName(fieldPath: string): string {
    // Convert "fieldName" or "field_name" to "Field Name"
    return fieldPath
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  // ========== AUTH ==========
  async signup(payload: SignupPayload): Promise<SignupResponse> {
    return this.request<SignupResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async login(payload: LoginPayload): Promise<LoginResponse> {
    return this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async logout(): Promise<{ success: boolean }> {
    const result = await this.request<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    });

    // Clear auth cache on logout
    if (result.success && typeof window !== 'undefined' && window.electronAPI?.clearAuthCache) {
      try {
        await window.electronAPI.clearAuthCache();
      } catch (error) {
        console.warn('Failed to clear auth cache on logout:', error);
        // Don't fail logout if cache clear fails
      }
    }

    return result;
  }

  // DEPRECATED: Use Supabase client directly from the client side for proper PKCE flow
  // async resetPassword(email: string): Promise<{ success: boolean }> {
  //   return this.request<{ success: boolean }>('/api/auth/reset-password', {
  //     method: 'POST',
  //     body: JSON.stringify({ email }),
  //   })
  // }

  async updatePassword(password: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/api/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
  }

  async getProfile(): Promise<ProfileResponse> {
    return this.request<ProfileResponse>('/api/auth/profile')
  }

  // ========== STUDENT - RESUME ==========
  async getResume(): Promise<ResumeResponse> {
    return this.request<ResumeResponse>('/api/student/resume')
  }

  async uploadResume(file: File): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/student/resume', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed')
    }

    return data
  }

  async downloadResume(): Promise<Blob> {
    const response = await fetch('/api/student/resume/download')

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Download failed')
    }

    return response.blob()
  }

  // ========== STUDENT - PROFILE ==========
  async extractResumeData(): Promise<ExtractDataResponse> {
    return this.request<ExtractDataResponse>('/api/student/profile/draft/extract', {
      method: 'POST',
    })
  }

  async getDraft(): Promise<{ draft: DraftProfileData | null }> {
    return this.request<{ draft: DraftProfileData | null }>('/api/student/profile/draft')
  }

  async updateDraft(draftId: string, updates: Partial<ExtractedResumeData>): Promise<{ success: boolean; draft: ExtractedResumeData }> {
    return this.request<{ success: boolean; draft: ExtractedResumeData }>('/api/student/profile/draft', {
      method: 'PUT',
      body: JSON.stringify({ draftId, updates }),
    })
  }

  async finalizeProfile(draftId: string): Promise<FinalizeProfileResponse> {
    return this.request<FinalizeProfileResponse>('/api/student/profile/draft/finalize', {
      method: 'POST',
      body: JSON.stringify({ draftId }),
    })
  }
}

export const api = new ApiClient()
