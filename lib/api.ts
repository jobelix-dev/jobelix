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
  FinalizeProfileResponse,
} from './types'

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
      throw new Error(data.error || 'Request failed')
    }

    return data
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
    return this.request('/api/auth/logout', {
      method: 'POST',
    })
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

  async getDraft(): Promise<{ draft: any }> {
    return this.request<{ draft: any }>('/api/student/profile/draft')
  }

  async updateDraft(draftId: string, updates: Partial<ExtractedResumeData>): Promise<{ success: boolean; draft: any }> {
    return this.request<{ success: boolean; draft: any }>('/api/student/profile/draft', {
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
