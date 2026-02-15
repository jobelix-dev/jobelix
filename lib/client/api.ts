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
  /**
   * Safely parse a response as JSON.
   * Returns null if the response body is not valid JSON (e.g. HTML error pages).
   */
  private async safeJson<T>(response: Response): Promise<T | null> {
    const text = await response.text()
    try {
      return JSON.parse(text) as T
    } catch {
      return null
    }
  }

  /**
   * Extract a human-readable error message from a failed response.
   * Handles JSON error bodies, HTML error pages, and unexpected formats.
   */
  private extractErrorMessage(status: number, data: Record<string, unknown> | null): string {
    if (!data) {
      // Non-JSON response (e.g. HTML error page) – provide a status-aware message
      if (status === 401) return 'Your session has expired. Please log in again.'
      if (status === 413) return 'The request is too large.'
      if (status === 429) return 'Too many requests. Please try again later.'
      if (status >= 500) return 'A server error occurred. Please try again later.'
      return `Request failed (${status})`
    }

    // Handle different JSON error response formats:
    // 1. { error: "message" }
    // 2. { message: "Validation failed", errors: [...] }
    // 3. { error: "message", code: "ERROR_CODE" }
    if (data.error && typeof data.error === 'string') {
      return data.error
    }
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      const firstError = data.errors[0]
      if (firstError) {
        return firstError.path
          ? `${this.formatFieldName(firstError.path)}: ${firstError.message}`
          : firstError.message
      }
    }
    if (data.message && typeof data.message === 'string') {
      return data.message
    }
    return 'Request failed'
  }

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

    const data = await this.safeJson<T>(response)

    if (!response.ok) {
      throw new Error(this.extractErrorMessage(response.status, data as Record<string, unknown> | null))
    }

    if (data === null) {
      // Successful status but non-JSON body – this shouldn't happen for our API
      throw new Error('Received an unexpected response from the server.')
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

  async deleteAccount(): Promise<{ success: boolean }> {
    const result = await this.request<{ success: boolean }>('/api/auth/account', {
      method: 'DELETE',
    });

    // Clear auth cache after account deletion
    if (result.success && typeof window !== 'undefined' && window.electronAPI?.clearAuthCache) {
      try {
        await window.electronAPI.clearAuthCache();
      } catch (error) {
        console.warn('Failed to clear auth cache after account deletion:', error);
      }
    }

    return result;
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

    const data = await this.safeJson<UploadResponse>(response)

    if (!response.ok) {
      throw new Error(this.extractErrorMessage(response.status, data as Record<string, unknown> | null))
    }

    if (data === null) {
      throw new Error('Received an unexpected response from the server.')
    }

    return data
  }

  async downloadResume(): Promise<Blob> {
    const response = await fetch('/api/student/resume/download')

    if (!response.ok) {
      const data = await this.safeJson<Record<string, unknown>>(response)
      throw new Error(this.extractErrorMessage(response.status, data))
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
